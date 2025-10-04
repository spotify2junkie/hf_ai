const express = require('express');
const huggingFaceService = require('../services/huggingface');

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

    res.json({
      success: true,
      date: date,
      count: papers.length,
      papers: papers
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