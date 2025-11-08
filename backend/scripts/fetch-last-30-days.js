#!/usr/bin/env node

/**
 * One-time script to fetch papers for the last 30 days
 *
 * Usage:
 *   node scripts/fetch-last-30-days.js
 *
 * Environment variables:
 *   DAYS - Number of days to fetch (default: 30)
 *   SKIP_TRANSLATION - Set to 'true' to skip translation (faster)
 */

const prefetchService = require('../src/services/prefetch-service');

// Configuration
const DAYS_TO_FETCH = parseInt(process.env.DAYS || '30', 10);
const SKIP_TRANSLATION = process.env.SKIP_TRANSLATION === 'true';

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 ONE-TIME FETCH: Last 30 Days of Papers');
  console.log('='.repeat(70));
  console.log(`📅 Fetching papers for last ${DAYS_TO_FETCH} days`);
  console.log(`🌏 Translation: ${SKIP_TRANSLATION ? 'DISABLED' : 'ENABLED'}`);
  console.log('⏰ Started:', new Date().toISOString());
  console.log('');

  // Temporarily override translation setting if requested
  const originalTranslateSetting = prefetchService.TRANSLATE_ON_PREFETCH;
  if (SKIP_TRANSLATION) {
    prefetchService.TRANSLATE_ON_PREFETCH = false;
  }

  const startTime = Date.now();
  const dates = prefetchService.getRecentDates(DAYS_TO_FETCH);

  console.log(`📊 Dates to process: ${dates[0]} to ${dates[dates.length - 1]}`);
  console.log('');

  const results = [];
  let successCount = 0;
  let failCount = 0;
  let totalPapers = 0;
  let totalTranslations = 0;

  // Process each date
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const progress = `[${i + 1}/${dates.length}]`;

    console.log(`\n${progress} Processing ${date}...`);

    try {
      const result = await prefetchService.prefetchDate(date);
      results.push(result);

      if (result.success) {
        successCount++;
        totalPapers += result.paperCount || 0;
        totalTranslations += result.translatedCount || 0;

        if (result.action === 'skipped') {
          console.log(`  ✅ ${date}: Skipped (already cached)`);
        } else if (result.action === 'no_papers') {
          console.log(`  ⚠️  ${date}: No papers found`);
        } else {
          console.log(`  ✅ ${date}: Fetched ${result.paperCount} papers${result.translatedCount ? `, translated ${result.translatedCount}` : ''}`);
        }
      } else {
        failCount++;
        console.log(`  ❌ ${date}: Failed - ${result.error}`);
      }

      // Small delay between requests to be nice to the API
      if (i < dates.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      failCount++;
      console.error(`  ❌ ${date}: Error - ${error.message}`);
      results.push({
        success: false,
        date,
        error: error.message,
      });
    }
  }

  // Restore original translation setting
  prefetchService.TRANSLATE_ON_PREFETCH = originalTranslateSetting;

  const duration = Date.now() - startTime;
  const durationMinutes = Math.floor(duration / 60000);
  const durationSeconds = Math.floor((duration % 60000) / 1000);

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 FETCH SUMMARY');
  console.log('='.repeat(70));
  console.log(`⏰ Duration: ${durationMinutes}m ${durationSeconds}s`);
  console.log(`📅 Dates processed: ${dates.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📄 Total papers fetched: ${totalPapers}`);
  if (!SKIP_TRANSLATION) {
    console.log(`🌏 Total translations: ${totalTranslations}`);
  }
  console.log('');

  // Print failures if any
  if (failCount > 0) {
    console.log('❌ Failed dates:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.date}: ${r.error}`);
      });
    console.log('');
  }

  console.log('✅ One-time fetch completed!');
  console.log('='.repeat(70));
  console.log('');

  // Exit
  process.exit(failCount > 0 ? 1 : 0);
}

// Handle errors
main().catch((error) => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});
