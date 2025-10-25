/**
 * Admin Routes
 *
 * Provides administrative endpoints for manual operations and monitoring.
 */

const express = require('express');
const prefetchService = require('../services/prefetch-service');
const cronScheduler = require('../services/cron-scheduler');

const router = express.Router();

/**
 * GET /api/admin/prefetch/status
 * Get status of last prefetch run
 */
router.get('/prefetch/status', (req, res) => {
  try {
    const status = prefetchService.getLastRunStatus();

    if (!status) {
      return res.json({
        message: 'No prefetch has been run yet',
        status: null,
      });
    }

    res.json({
      success: true,
      lastRun: status,
    });
  } catch (error) {
    console.error('[Admin] Error fetching prefetch status:', error);
    res.status(500).json({
      error: 'Failed to get prefetch status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/admin/prefetch/trigger
 * Manually trigger prefetch for recent days
 */
router.post('/prefetch/trigger', async (req, res) => {
  try {
    console.log('[Admin] Manual prefetch triggered');

    // Start prefetch in background
    prefetchService
      .runPrefetch()
      .then((summary) => {
        console.log('[Admin] Manual prefetch completed:', summary);
      })
      .catch((error) => {
        console.error('[Admin] Manual prefetch failed:', error);
      });

    res.json({
      success: true,
      message: 'Prefetch started in background',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin] Error triggering prefetch:', error);
    res.status(500).json({
      error: 'Failed to trigger prefetch',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/admin/prefetch/date
 * Manually prefetch papers for a specific date
 * Body: { date: "YYYY-MM-DD" }
 */
router.post('/prefetch/date', async (req, res) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        error: 'Date parameter is required',
        example: { date: '2024-01-15' },
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    console.log(`[Admin] Manual prefetch for date: ${date}`);

    // Run prefetch for specific date
    const result = await prefetchService.prefetchDate(date);

    res.json({
      success: result.success,
      result,
    });
  } catch (error) {
    console.error('[Admin] Error prefetching date:', error);
    res.status(500).json({
      error: 'Failed to prefetch date',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/admin/cron/status
 * Get status of all cron jobs
 */
router.get('/cron/status', (req, res) => {
  try {
    const tasks = cronScheduler.getStatus();

    res.json({
      success: true,
      enabled: process.env.CRON_ENABLED !== 'false',
      tasks,
      config: {
        prefetchDays: process.env.PREFETCH_DAYS || 3,
        translateOnPrefetch: process.env.TRANSLATE_ON_PREFETCH !== 'false',
        schedule: process.env.PREFETCH_CRON_SCHEDULE || '0 */6 * * *',
        timezone: process.env.TZ || 'UTC',
      },
    });
  } catch (error) {
    console.error('[Admin] Error fetching cron status:', error);
    res.status(500).json({
      error: 'Failed to get cron status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/admin/health
 * Admin health check with system info
 */
router.get('/health', (req, res) => {
  try {
    res.json({
      service: 'admin',
      status: 'OK',
      timestamp: new Date().toISOString(),
      endpoints: {
        prefetchStatus: 'GET /api/admin/prefetch/status',
        triggerPrefetch: 'POST /api/admin/prefetch/trigger',
        prefetchDate: 'POST /api/admin/prefetch/date',
        cronStatus: 'GET /api/admin/cron/status',
      },
      features: {
        cronScheduler: true,
        autoPrefetch: true,
        manualTrigger: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      service: 'admin',
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

module.exports = router;
