const express = require('express');
const validator = require('validator');
const sessionManager = require('../services/session-manager');
const promptTemplates = require('../services/prompt-templates');
const dashscopeService = require('../services/dashscope');
const pdfHandler = require('../services/pdf-handler');
const cache = require('../services/cache');

const router = express.Router();

/**
 * POST /api/qa/session
 * Create or retrieve Q&A session for a paper
 * Body: { paper_id, pdf_url?, paper_title? }
 */
router.post('/session', async (req, res) => {
  try {
    const { paper_id, pdf_url, paper_title } = req.body;

    // Validate paper_id
    if (!paper_id) {
      return res.status(400).json({
        error: 'paper_id is required'
      });
    }

    const sanitizedPaperId = validator.escape(paper_id.trim());
    const sanitizedTitle = paper_title ? validator.escape(paper_title.trim()) : 'Unknown';

    console.log(`\n🔍 Looking for Q&A session for paper: ${sanitizedPaperId}`);

    // Check if fileId is cached
    let fileId = await cache.getFileId(sanitizedPaperId);

    // If no cached fileId and pdf_url provided, upload it
    if (!fileId && pdf_url) {
      console.log(`📤 No cached fileId, uploading PDF...`);

      // Validate URL
      if (!validator.isURL(pdf_url, { protocols: ['http', 'https'], require_protocol: true })) {
        return res.status(400).json({
          error: 'Invalid PDF URL format',
          provided: pdf_url
        });
      }

      const url = new URL(pdf_url);
      const allowedHosts = ['arxiv.org', 'www.arxiv.org', 'export.arxiv.org'];
      if (!allowedHosts.includes(url.hostname.toLowerCase())) {
        return res.status(400).json({
          error: 'Only arxiv.org PDFs are allowed',
          provided: url.hostname
        });
      }

      if (!url.pathname.toLowerCase().endsWith('.pdf')) {
        return res.status(400).json({
          error: 'URL must point to a PDF file'
        });
      }

      // Download and upload PDF
      let pdfPath = null;
      try {
        pdfPath = await pdfHandler.downloadPDF(pdf_url);
        fileId = await dashscopeService.uploadPDF(pdfPath);

        // Cache the fileId
        await cache.setFileId(sanitizedPaperId, fileId);

        console.log(`✅ PDF uploaded and fileId cached: ${fileId}`);
      } finally {
        if (pdfPath) {
          pdfHandler.cleanupFile(pdfPath);
        }
      }
    }

    if (!fileId) {
      return res.status(400).json({
        error: 'No fileId available. Please provide pdf_url to upload the paper first.'
      });
    }

    // Create or get existing session
    const session = sessionManager.createSession(sanitizedPaperId, fileId, {
      paperTitle: sanitizedTitle,
      pdfUrl: pdf_url || ''
    });

    // Get available prompts
    const prompts = promptTemplates.getAllCategories();

    res.json({
      success: true,
      sessionId: session.sessionId,
      fileId: session.fileId,
      paperId: session.paperId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      availablePrompts: prompts,
      conversationHistory: session.conversationHistory
    });

  } catch (error) {
    console.error('❌ Session creation error:', error);
    res.status(500).json({
      error: 'Failed to create session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/qa/ask
 * Ask a question and stream the response
 * Body: { sessionId, question, promptId? }
 */
router.post('/ask', async (req, res) => {
  const { sessionId, question, promptId } = req.body;

  try {
    // Validate input
    if (!sessionId || !question) {
      return res.status(400).json({
        error: 'sessionId and question are required'
      });
    }

    // Get session
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found or expired',
        sessionId
      });
    }

    // Sanitize question
    const sanitizedQuestion = validator.escape(question.trim());

    if (sanitizedQuestion.length < 5) {
      return res.status(400).json({
        error: 'Question must be at least 5 characters long'
      });
    }

    console.log(`\n💬 Q&A Request:`);
    console.log(`   Session: ${sessionId}`);
    console.log(`   Question: ${sanitizedQuestion.substring(0, 100)}...`);

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Send initial status
    res.write(`data: ${JSON.stringify({ status: 'processing' })}\n\n`);

    // Add user question to conversation history
    sessionManager.addConversation(sessionId, 'user', sanitizedQuestion);

    // Get conversation history for context
    const history = sessionManager.getConversationHistory(sessionId, 8)
      .map(entry => ({
        role: entry.role,
        content: entry.content
      }));

    // Capture assistant response for conversation history
    let assistantResponse = '';
    const originalWrite = res.write.bind(res);
    res.write = function(chunk) {
      try {
        const str = chunk.toString();
        if (str.startsWith('data: ')) {
          const data = JSON.parse(str.slice(6));
          if (data.chunk) {
            assistantResponse += data.chunk;
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
      return originalWrite(chunk);
    };

    // Stream Q&A response
    await dashscopeService.streamQA(
      session.fileId,
      sanitizedQuestion,
      history.slice(-4), // Last 4 messages for context
      res
    );

    // Restore original write function
    res.write = originalWrite;

    // Add assistant response to conversation history
    if (assistantResponse) {
      sessionManager.addConversation(sessionId, 'assistant', assistantResponse);
    }

    res.end();

  } catch (error) {
    console.error('❌ Q&A error:', error);

    const errorMessage = {
      error: error.message,
      status: 'error'
    };
    res.write(`data: ${JSON.stringify(errorMessage)}\n\n`);
    res.end();
  }
});

/**
 * GET /api/qa/prompts
 * Get all available prompt templates
 */
router.get('/prompts', (req, res) => {
  try {
    const prompts = promptTemplates.getAllCategories();
    const stats = promptTemplates.getStats();

    res.json({
      success: true,
      categories: prompts,
      stats
    });
  } catch (error) {
    console.error('❌ Prompts fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch prompts'
    });
  }
});

/**
 * GET /api/qa/prompts/:categoryId
 * Get prompts for a specific category
 */
router.get('/prompts/:categoryId', (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = promptTemplates.getCategoryById(categoryId);

    if (!category) {
      return res.status(404).json({
        error: 'Category not found',
        categoryId
      });
    }

    res.json({
      success: true,
      category
    });
  } catch (error) {
    console.error('❌ Category fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch category'
    });
  }
});

/**
 * GET /api/qa/session/:sessionId
 * Get session information
 */
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found or expired',
        sessionId
      });
    }

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        paperId: session.paperId,
        fileId: session.fileId,
        createdAt: session.createdAt,
        lastAccessedAt: session.lastAccessedAt,
        expiresAt: session.expiresAt,
        conversationHistory: session.conversationHistory,
        metadata: session.metadata
      }
    });
  } catch (error) {
    console.error('❌ Session fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch session'
    });
  }
});

/**
 * DELETE /api/qa/session/:sessionId
 * Delete a session
 */
router.delete('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const deleted = sessionManager.deleteSession(sessionId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId
      });
    }

    res.json({
      success: true,
      message: 'Session deleted',
      sessionId
    });
  } catch (error) {
    console.error('❌ Session delete error:', error);
    res.status(500).json({
      error: 'Failed to delete session'
    });
  }
});

/**
 * GET /api/qa/stats
 * Get Q&A statistics
 */
router.get('/stats', (req, res) => {
  try {
    const sessionStats = sessionManager.getStats();
    const promptStats = promptTemplates.getStats();

    res.json({
      success: true,
      sessions: sessionStats,
      prompts: promptStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Stats fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * GET /api/qa/health
 * Health check for Q&A service
 */
router.get('/health', (req, res) => {
  res.json({
    service: 'qa',
    status: 'OK',
    timestamp: new Date().toISOString(),
    dashscope_configured: !!process.env.DASHSCOPE_API_KEY,
    endpoints: {
      createSession: 'POST /api/qa/session',
      askQuestion: 'POST /api/qa/ask',
      getPrompts: 'GET /api/qa/prompts',
      getSession: 'GET /api/qa/session/:sessionId',
      deleteSession: 'DELETE /api/qa/session/:sessionId',
      getStats: 'GET /api/qa/stats'
    }
  });
});

module.exports = router;
