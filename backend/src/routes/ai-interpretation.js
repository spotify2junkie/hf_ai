const express = require('express');
const pdfHandler = require('../services/pdf-handler');
const dashscopeService = require('../services/dashscope');

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
    // Validate input
    if (!pdf_url) {
      return res.status(400).json({
        error: 'pdf_url is required',
        example: { pdf_url: 'https://arxiv.org/pdf/2509.19803.pdf' }
      });
    }

    console.log(`\n🚀 Starting AI interpretation for paper:`);
    console.log(`   Title: ${paper_title || 'Unknown'}`);
    console.log(`   ID: ${paper_id || 'Unknown'}`);
    console.log(`   URL: ${pdf_url}`);

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
    await dashscopeService.streamAnalysis(fileId, res);

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
