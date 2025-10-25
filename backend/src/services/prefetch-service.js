/**
 * Prefetch Service
 *
 * Automatically fetches papers from HuggingFace for recent days
 * and stores them in the database with translations.
 */

const huggingFaceService = require('./huggingface');
const papersCache = require('./papers-cache');
const dashscopeService = require('./dashscope');
const cache = require('./cache');

class PrefetchService {
  constructor() {
    // Number of days to prefetch (configurable via env)
    this.DAYS_TO_PREFETCH = parseInt(process.env.PREFETCH_DAYS || '3', 10);

    // Whether to translate during prefetch
    this.TRANSLATE_ON_PREFETCH = process.env.TRANSLATE_ON_PREFETCH !== 'false';

    // Track last run
    this.lastRunTimestamp = null;
    this.lastRunStatus = null;
  }

  /**
   * Get dates for the last N days
   * @param {number} days - Number of days to fetch
   * @returns {string[]} Array of dates in YYYY-MM-DD format
   */
  getRecentDates(days = 3) {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
  }

  /**
   * Prefetch papers for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} Result with success status and details
   */
  async prefetchDate(date) {
    const startTime = Date.now();
    console.log(`\n📅 Prefetching papers for ${date}...`);

    try {
      // Check if we already have valid cached papers for this date
      const hasCache = await papersCache.hasValidCache(date);

      if (hasCache) {
        console.log(`✅ Papers for ${date} already cached, skipping fetch`);
        return {
          success: true,
          date,
          action: 'skipped',
          reason: 'already_cached',
          duration: Date.now() - startTime,
        };
      }

      // Fetch papers from HuggingFace
      console.log(`🔄 Fetching from HuggingFace API for ${date}...`);
      const papers = await huggingFaceService.fetchPapers(date);

      if (!papers || papers.length === 0) {
        console.log(`⚠️  No papers found for ${date}`);
        return {
          success: true,
          date,
          action: 'no_papers',
          paperCount: 0,
          duration: Date.now() - startTime,
        };
      }

      console.log(`📦 Found ${papers.length} papers for ${date}`);

      // Cache papers in database
      await papersCache.cachePapers(papers, date);
      console.log(`✅ Cached ${papers.length} papers in database`);

      // Translate abstracts if enabled
      let translatedCount = 0;
      if (this.TRANSLATE_ON_PREFETCH) {
        translatedCount = await this.translatePapers(papers, date);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Prefetch completed for ${date} in ${duration}ms`);
      console.log(`   - Papers: ${papers.length}`);
      console.log(`   - Translations: ${translatedCount}`);

      return {
        success: true,
        date,
        action: 'fetched',
        paperCount: papers.length,
        translatedCount,
        duration,
      };
    } catch (error) {
      console.error(`❌ Prefetch failed for ${date}:`, error.message);
      return {
        success: false,
        date,
        action: 'failed',
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Translate abstracts for papers
   * @param {Array} papers - Papers to translate
   * @param {string} date - Date of papers
   * @returns {Promise<number>} Number of papers translated
   */
  async translatePapers(papers, date) {
    console.log(`🌏 Translating abstracts for ${papers.length} papers...`);
    let translatedCount = 0;

    // Translate in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < papers.length; i += batchSize) {
      const batch = papers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (paper) => {
          // Skip if no abstract
          if (!paper.abstract) {
            return;
          }

          // Check if already translated
          if (paper.abstract_zh) {
            translatedCount++;
            return;
          }

          try {
            // Translate
            const translation = await dashscopeService.translateAbstract(paper.abstract);

            // Store in database
            await papersCache.updateTranslation(paper.paper_id, translation);

            // Also cache in file system
            await cache.setTranslation(paper.paper_id, translation);

            translatedCount++;
            console.log(`  ✅ Translated ${paper.paper_id}`);
          } catch (error) {
            console.error(`  ❌ Translation failed for ${paper.paper_id}:`, error.message);
          }
        })
      );

      // Small delay between batches to respect rate limits
      if (i + batchSize < papers.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Translated ${translatedCount}/${papers.length} papers`);
    return translatedCount;
  }

  /**
   * Run prefetch for recent days
   * @returns {Promise<Object>} Summary of prefetch results
   */
  async runPrefetch() {
    const startTime = Date.now();
    this.lastRunTimestamp = new Date().toISOString();

    console.log('\n' + '='.repeat(60));
    console.log('🤖 AUTOMATED PAPER PREFETCH STARTED');
    console.log('='.repeat(60));
    console.log(`⏰ Time: ${this.lastRunTimestamp}`);
    console.log(`📊 Fetching papers for last ${this.DAYS_TO_PREFETCH} days`);
    console.log(`🌏 Translation: ${this.TRANSLATE_ON_PREFETCH ? 'ENABLED' : 'DISABLED'}`);

    const dates = this.getRecentDates(this.DAYS_TO_PREFETCH);
    console.log(`📅 Dates: ${dates.join(', ')}`);

    const results = [];

    // Process each date sequentially
    for (const date of dates) {
      const result = await this.prefetchDate(date);
      results.push(result);

      // Small delay between dates
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Calculate summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalPapers = results.reduce((sum, r) => sum + (r.paperCount || 0), 0);
    const totalTranslations = results.reduce((sum, r) => sum + (r.translatedCount || 0), 0);
    const totalDuration = Date.now() - startTime;

    const summary = {
      timestamp: this.lastRunTimestamp,
      datesProcessed: dates.length,
      successful,
      failed,
      totalPapers,
      totalTranslations,
      duration: totalDuration,
      results,
    };

    this.lastRunStatus = summary;

    console.log('\n' + '='.repeat(60));
    console.log('📊 PREFETCH SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successful}/${dates.length} dates`);
    console.log(`📦 Total papers: ${totalPapers}`);
    console.log(`🌏 Total translations: ${totalTranslations}`);
    console.log(`⏱️  Total duration: ${totalDuration}ms`);
    console.log('='.repeat(60) + '\n');

    return summary;
  }

  /**
   * Get status of last prefetch run
   * @returns {Object|null} Last run status or null if never run
   */
  getLastRunStatus() {
    return this.lastRunStatus;
  }
}

module.exports = new PrefetchService();
