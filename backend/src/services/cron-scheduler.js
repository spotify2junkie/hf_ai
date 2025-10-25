/**
 * Cron Scheduler
 *
 * Manages scheduled tasks for automated paper prefetching.
 */

const cron = require('node-cron');
const prefetchService = require('./prefetch-service');

class CronScheduler {
  constructor() {
    this.tasks = [];
    this.isInitialized = false;
  }

  /**
   * Initialize and start all scheduled tasks
   */
  init() {
    if (this.isInitialized) {
      console.warn('⚠️  Cron scheduler already initialized');
      return;
    }

    // Detect Vercel serverless environment
    const isVercel = process.env.VERCEL === '1';
    if (isVercel) {
      console.log('☁️  Vercel serverless detected - using Vercel Cron instead of node-cron');
      console.log('📝 Configure cron in vercel.json to trigger /api/admin/prefetch/trigger');
      return;
    }

    // Check if cron is enabled
    const cronEnabled = process.env.CRON_ENABLED !== 'false';

    if (!cronEnabled) {
      console.log('⏸️  Cron scheduler is disabled (CRON_ENABLED=false)');
      return;
    }

    console.log('🤖 Initializing cron scheduler...');

    // Setup paper prefetch cron
    this.setupPrefetchCron();

    // Run prefetch on startup if enabled
    const runOnStartup = process.env.PREFETCH_ON_STARTUP === 'true';
    if (runOnStartup) {
      console.log('🚀 Running initial prefetch on startup...');
      setTimeout(() => {
        prefetchService.runPrefetch().catch((err) => {
          console.error('❌ Initial prefetch failed:', err);
        });
      }, 5000); // Wait 5 seconds after startup
    }

    this.isInitialized = true;
    console.log('✅ Cron scheduler initialized');
  }

  /**
   * Setup paper prefetch cron job
   */
  setupPrefetchCron() {
    // Default schedule: Every 6 hours (0 */6 * * *)
    // Runs at: 00:00, 06:00, 12:00, 18:00
    const schedule = process.env.PREFETCH_CRON_SCHEDULE || '0 */6 * * *';

    console.log(`📅 Scheduling paper prefetch: ${schedule}`);

    // Validate cron expression
    if (!cron.validate(schedule)) {
      console.error(`❌ Invalid cron schedule: ${schedule}`);
      return;
    }

    const task = cron.schedule(
      schedule,
      async () => {
        console.log('\n🔔 Cron triggered: Paper Prefetch');
        try {
          await prefetchService.runPrefetch();
        } catch (error) {
          console.error('❌ Prefetch cron job failed:', error);
        }
      },
      {
        scheduled: true,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.tasks.push({
      name: 'paper-prefetch',
      schedule,
      task,
    });

    console.log(`✅ Paper prefetch scheduled: ${schedule} (${process.env.TZ || 'UTC'})`);
  }

  /**
   * Stop all scheduled tasks
   */
  stopAll() {
    console.log('⏹️  Stopping all cron tasks...');

    this.tasks.forEach((t) => {
      t.task.stop();
      console.log(`  Stopped: ${t.name}`);
    });

    this.tasks = [];
    this.isInitialized = false;

    console.log('✅ All cron tasks stopped');
  }

  /**
   * Get status of all scheduled tasks
   * @returns {Array} Array of task statuses
   */
  getStatus() {
    return this.tasks.map((t) => ({
      name: t.name,
      schedule: t.schedule,
      timezone: process.env.TZ || 'UTC',
      isRunning: true,
    }));
  }
}

module.exports = new CronScheduler();
