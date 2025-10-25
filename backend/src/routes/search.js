/**
 * Search Routes
 *
 * Provides API endpoints for fuzzy searching papers by topics.
 * Implements rate limiting and input validation.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const searchService = require('../services/search-service');

const router = express.Router();

// Rate limiter specific to search endpoint
// Development: 500 requests per 15 minutes (generous for testing)
// Production: Should be lower based on usage patterns
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // More lenient in development
  message: 'Too many search requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // Skip health check
});

/**
 * GET /api/search/papers
 * Search papers by topics using fuzzy search
 * Query params:
 *   - q: Search query (required, 2-200 chars)
 *   - page: Page number (optional, default: 1, min: 1)
 *   - limit: Results per page (optional, default: 10, min: 1, max: 50)
 */
router.get('/papers', searchLimiter, async (req, res) => {
  try {
    const { q, page, limit } = req.query;

    // Validate query parameter
    if (!q) {
      return res.status(400).json({
        error: 'Query parameter "q" is required',
        example: '/api/search/papers?q=machine+learning&page=1&limit=10',
      });
    }

    if (typeof q !== 'string') {
      return res.status(400).json({
        error: 'Query parameter "q" must be a string',
      });
    }

    if (q.length < 2) {
      return res.status(400).json({
        error: 'Query must be at least 2 characters long',
        provided: q,
      });
    }

    if (q.length > 200) {
      return res.status(400).json({
        error: 'Query must be at most 200 characters long',
        provided: `${q.substring(0, 50)}... (${q.length} chars)`,
      });
    }

    // Parse and validate pagination parameters
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        error: 'Page must be a positive integer',
        provided: page,
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        error: 'Limit must be an integer between 1 and 50',
        provided: limit,
      });
    }

    // Perform search
    console.log(
      `[Search API] Query: "${q}", Page: ${pageNum}, Limit: ${limitNum}`
    );

    const results = await searchService.searchPapers(q, pageNum, limitNum);

    // Log search result summary
    console.log(
      `[Search API] Found ${results.pagination.totalResults} results in ${results.searchMetadata.executionTime}ms`
    );

    res.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('[Search API] Error:', error);

    // Handle validation errors
    if (error.message.includes('Query must be')) {
      return res.status(400).json({
        error: 'Invalid query parameter',
        details: error.message,
      });
    }

    if (error.message.includes('Page must be') || error.message.includes('Limit must be')) {
      return res.status(400).json({
        error: 'Invalid pagination parameter',
        details: error.message,
      });
    }

    // Handle database errors
    if (error.message.includes('Prisma')) {
      return res.status(503).json({
        error: 'Database temporarily unavailable',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    });
  }
});

/**
 * GET /api/search/config
 * Get search service configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = searchService.getConfig();

    res.json({
      success: true,
      config: {
        ...config,
        queryConstraints: {
          minLength: 2,
          maxLength: 200,
        },
        paginationConstraints: {
          minPage: 1,
          minLimit: 1,
          maxLimit: 50,
          defaultLimit: 10,
        },
      },
    });
  } catch (error) {
    console.error('[Search API] Error fetching config:', error);
    res.status(500).json({
      error: 'Failed to retrieve configuration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/search/health
 * Health check for search service
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      service: 'search',
      status: 'OK',
      timestamp: new Date().toISOString(),
      endpoints: {
        searchPapers: 'GET /api/search/papers?q=query&page=1&limit=10',
        config: 'GET /api/search/config',
        health: 'GET /api/search/health',
      },
      features: {
        fuzzySearch: true,
        topicMatching: true,
        pagination: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      service: 'search',
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

module.exports = router;
