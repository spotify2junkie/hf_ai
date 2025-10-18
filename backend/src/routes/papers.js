const express = require('express');
const huggingFaceService = require('../services/huggingface');
const dashscopeService = require('../services/dashscope');
const cache = require('../services/cache');

const router = express.Router();

/**
 * GET /api/papers
 * Fetch papers for a specific date
 * Query params: date (YYYY-MM-DD format)
 */
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;

    // Validate date parameter
    if (!date) {
      return res.status(400).json({
        error: 'Date parameter is required',
        example: '/api/papers?date=2024-01-15'
      });
    }

    if (!huggingFaceService.isValidDate(date)) {
      return res.status(400).json({
        error: 'Invalid date format. Please use YYYY-MM-DD format',
        provided: date,
        example: '2024-01-15'
      });
    }

    // Check if date is not in the future
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (requestedDate > today) {
      return res.status(400).json({
        error: 'Cannot fetch papers for future dates',
        provided: date,
        maxDate: today.toISOString().split('T')[0]
      });
    }

    // Fetch papers from HuggingFace API
    const papers = await huggingFaceService.fetchDailyPapers(date);

    console.log(`📊 Fetched ${papers.length} papers from HuggingFace`);

    // Translate papers synchronously (check cache first, then translate if needed)
    const papersWithTranslations = await Promise.all(
      papers.map(async (paper) => {
        // Skip if no abstract
        if (!paper.abstract) {
          return paper;
        }

        // Check cache first
        const cachedTranslation = await cache.getTranslation(paper.paper_id);

        if (cachedTranslation) {
          console.log(`✅ Cache hit for ${paper.paper_id}`);
          return {
            ...paper,
            abstract_zh: cachedTranslation
          };
        }

        // No cache - translate now
        try {
          console.log(`🌏 Translating ${paper.paper_id} (${paper.abstract.length} chars)...`);
          const translation = await dashscopeService.translateAbstract(paper.abstract);

          // Cache the translation
          await cache.setTranslation(paper.paper_id, translation);
          console.log(`✅ Translated and cached ${paper.paper_id}`);

          return {
            ...paper,
            abstract_zh: translation
          };
        } catch (error) {
          console.error(`❌ Translation failed for ${paper.paper_id}:`, error.message);
          return paper; // Return without translation on error
        }
      })
    );

    const withTranslation = papersWithTranslations.filter(p => p.abstract_zh).length;
    console.log(`📊 Final result: ${withTranslation}/${papers.length} papers with translations`);

    res.json({
      success: true,
      date: date,
      count: papersWithTranslations.length,
      papers: papersWithTranslations
    });

  } catch (error) {
    console.error('Papers API error:', error);

    // Handle different types of errors
    if (error.message.includes('HuggingFace API error')) {
      return res.status(502).json({
        error: 'External API error',
        details: error.message
      });
    }

    if (error.message.includes('Network error')) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        details: 'Unable to connect to HuggingFace API'
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

/**
 * GET /api/papers/health
 * Health check for papers service
 */
router.get('/health', (req, res) => {
  res.json({
    service: 'papers',
    status: 'OK',
    timestamp: new Date().toISOString(),
    endpoints: {
      fetchPapers: 'GET /api/papers?date=YYYY-MM-DD'
    }
  });
});

module.exports = router;