const express = require('express');
const validator = require('validator');
const pdfHandler = require('../services/pdf-handler');
const dashscopeService = require('../services/dashscope');
const cache = require('../services/cache');

const router = express.Router();

/**
 * POST /api/ai-interpretation
 * Start AI interpretation of a paper
 * Request body: { pdf_url: string, paper_id?: string, paper_title?: string }
 * Response: Server-Sent Events (SSE) stream
 */
router.post('/', async (req, res) => {
  const { pdf_url, paper_id, paper_title } = req.body;
  let pdfPath = null;

  try {
    // Validate and sanitize input
    if (!pdf_url) {
      return res.status(400).json({
        error: 'pdf_url is required',
        example: { pdf_url: 'https://arxiv.org/pdf/2509.19803.pdf' }
      });
    }

    // Validate URL format
    if (!validator.isURL(pdf_url, { protocols: ['http', 'https'], require_protocol: true })) {
      return res.status(400).json({
        error: 'Invalid PDF URL format',
        provided: pdf_url
      });
    }

    // Only allow arxiv.org PDFs for security
    const url = new URL(pdf_url);
    const allowedHosts = ['arxiv.org', 'www.arxiv.org', 'export.arxiv.org'];
    if (!allowedHosts.includes(url.hostname.toLowerCase())) {
      return res.status(400).json({
        error: 'Only arxiv.org PDFs are allowed',
        provided: url.hostname,
        allowed: allowedHosts
      });
    }

    // Additional validation: must be a PDF file
    if (!url.pathname.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({
        error: 'URL must point to a PDF file',
        provided: url.pathname
      });
    }

    // Sanitize paper_title if provided (prevent injection)
    const sanitizedTitle = paper_title ? validator.escape(paper_title.trim()) : 'Unknown';
    const sanitizedPaperId = paper_id ? validator.escape(paper_id.trim()) : 'Unknown';

    console.log(`\n🚀 Starting AI interpretation for paper:`);
    console.log(`   Title: ${sanitizedTitle}`);
    console.log(`   ID: ${sanitizedPaperId}`);
    console.log(`   URL: ${pdf_url}`);

    // Check cache first (only if paper_id is provided)
    if (sanitizedPaperId && sanitizedPaperId !== 'Unknown') {
      const cachedAnalysis = await cache.get(sanitizedPaperId);
      if (cachedAnalysis) {
        console.log(`📦 Using cached analysis for paper ${sanitizedPaperId}`);

        // Set up Server-Sent Events for cached response
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        });

        // Send cached status
        res.write(`data: ${JSON.stringify({ status: 'cached', message: 'Using cached analysis' })}\n\n`);

        // Send cached content (simulate streaming for consistent UX)
        const chunkSize = 100;
        for (let i = 0; i < cachedAnalysis.length; i += chunkSize) {
          const chunk = cachedAnalysis.slice(i, i + chunkSize);
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        res.write(`data: ${JSON.stringify({ status: 'complete' })}\n\n`);
        res.end();
        return;
      }
    }

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    });

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      if (pdfPath) {
        pdfHandler.cleanupFile(pdfPath);
      }
      console.log('🔌 Client disconnected');
    });

    // Step 1: Download PDF
    res.write(`data: ${JSON.stringify({ status: 'downloading' })}\n\n`);
    pdfPath = await pdfHandler.downloadPDF(pdf_url);

    // Step 2: Upload to DashScope
    res.write(`data: ${JSON.stringify({ status: 'uploading' })}\n\n`);
    const fileId = await dashscopeService.uploadPDF(pdfPath);

    // Step 3: Stream analysis
    res.write(`data: ${JSON.stringify({ status: 'analyzing' })}\n\n`);

    // Capture analysis content for caching
    let analysisContent = '';
    const originalWrite = res.write.bind(res);
    res.write = function(chunk) {
      // Capture content chunks for caching
      try {
        const str = chunk.toString();
        if (str.startsWith('data: ')) {
          const data = JSON.parse(str.slice(6));
          if (data.chunk) {
            analysisContent += data.chunk;
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
      return originalWrite(chunk);
    };

    await dashscopeService.streamAnalysis(fileId, res);

    // Restore original write function
    res.write = originalWrite;

    // Cache the analysis if we have paper_id and content
    if (sanitizedPaperId && sanitizedPaperId !== 'Unknown' && analysisContent) {
      console.log(`💾 Caching analysis for paper ${sanitizedPaperId} (${analysisContent.length} chars)`);
      await cache.set(sanitizedPaperId, analysisContent);
    }

    // Cleanup
    clearInterval(heartbeat);
    pdfHandler.cleanupFile(pdfPath);

    res.end();

  } catch (error) {
    console.error('❌ AI interpretation error:', error);

    // Send error to client
    const errorMessage = {
      error: error.message,
      status: 'error'
    };
    res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);

    // Cleanup on error
    if (pdfPath) {
      pdfHandler.cleanupFile(pdfPath);
    }

    res.end();
  }
});

/**
 * GET /api/ai-interpretation/health
 * Health check for AI interpretation service
 */
router.get('/health', (req, res) => {
  res.json({
    service: 'ai-interpretation',
    status: 'OK',
    timestamp: new Date().toISOString(),
    dashscope_configured: !!process.env.DASHSCOPE_API_KEY,
    endpoints: {
      interpret: 'POST /api/ai-interpretation'
    }
  });
});

module.exports = router;
