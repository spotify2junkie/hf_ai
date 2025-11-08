#!/usr/bin/env node

/**
 * Script to translate missing Chinese abstracts
 *
 * Usage:
 *   node scripts/translate-missing-abstracts.js
 *
 * Environment variables:
 *   BATCH_SIZE - Number of papers to translate per batch (default: 10)
 *   DRY_RUN - Set to 'true' to preview without translating (default: false)
 */

require('dotenv').config();
const { PrismaClient } = require('../src/generated/prisma');
const dashscopeService = require('../src/services/dashscope');

const prisma = new PrismaClient();

// Configuration
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10', 10);
const DRY_RUN = process.env.DRY_RUN === 'true';

// Rate limiting: delay between translations (ms)
const TRANSLATION_DELAY = 2000; // 2 seconds between each translation

// Helper to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🌏 MISSING CHINESE ABSTRACTS TRANSLATION');
  console.log('='.repeat(70));
  console.log(`📊 Batch size: ${BATCH_SIZE}`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log(`🧪 Dry run: ${DRY_RUN ? 'YES' : 'NO'}`);
  console.log('');

  const startTime = Date.now();

  try {
    // Step 1: Find all papers missing Chinese abstracts
    console.log('🔍 Finding papers without Chinese abstracts...');

    const papersWithoutTranslation = await prisma.paper.findMany({
      where: {
        OR: [
          { abstractZh: null },
          { abstractZh: '' }
        ],
        abstract: {
          not: null,
          not: ''
        }
      },
      select: {
        id: true,
        paperId: true,
        title: true,
        abstract: true,
        abstractZh: true
      },
      orderBy: {
        publishedDate: 'desc'
      }
    });

    console.log(`\n✅ Found ${papersWithoutTranslation.length} papers without Chinese translations\n`);

    if (papersWithoutTranslation.length === 0) {
      console.log('🎉 All papers already have Chinese translations!');
      return;
    }

    if (DRY_RUN) {
      console.log('🧪 DRY RUN - Showing first 10 papers that would be translated:\n');
      papersWithoutTranslation.slice(0, 10).forEach((paper, idx) => {
        console.log(`  ${idx + 1}. ${paper.paperId}`);
        console.log(`     ${paper.title.substring(0, 80)}...`);
        console.log(`     Abstract length: ${paper.abstract?.length || 0} chars\n`);
      });
      console.log(`\n📊 Total papers to translate: ${papersWithoutTranslation.length}`);
      return;
    }

    // Step 2: Translate in batches
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (let i = 0; i < papersWithoutTranslation.length; i += BATCH_SIZE) {
      const batch = papersWithoutTranslation.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(papersWithoutTranslation.length / BATCH_SIZE);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 Batch ${batchNum}/${totalBatches} (papers ${i + 1}-${Math.min(i + BATCH_SIZE, papersWithoutTranslation.length)})`);
      console.log('='.repeat(60));

      for (let j = 0; j < batch.length; j++) {
        const paper = batch[j];
        const paperNum = i + j + 1;
        const progress = `[${paperNum}/${papersWithoutTranslation.length}]`;

        console.log(`\n${progress} Processing: ${paper.paperId}`);
        console.log(`  Title: ${paper.title.substring(0, 60)}...`);
        console.log(`  Abstract: ${paper.abstract?.length || 0} chars`);

        try {
          // Translate the abstract
          console.log(`  🌏 Translating...`);
          const translatedAbstract = await dashscopeService.translateAbstract(paper.abstract);

          if (!translatedAbstract || translatedAbstract.trim().length === 0) {
            throw new Error('Empty translation returned');
          }

          // Update the database
          await prisma.paper.update({
            where: { id: paper.id },
            data: { abstractZh: translatedAbstract }
          });

          successCount++;
          console.log(`  ✅ Success! Translated: ${translatedAbstract.length} chars`);

          // Add delay between translations to respect rate limits
          if (paperNum < papersWithoutTranslation.length) {
            console.log(`  ⏱️  Waiting ${TRANSLATION_DELAY/1000}s before next translation...`);
            await delay(TRANSLATION_DELAY);
          }

        } catch (error) {
          failCount++;
          const errorMsg = `${paper.paperId}: ${error.message}`;
          errors.push(errorMsg);
          console.log(`  ❌ Failed: ${error.message}`);

          // Continue with next paper
          continue;
        }
      }

      // Delay between batches (longer delay)
      if (i + BATCH_SIZE < papersWithoutTranslation.length) {
        console.log(`\n⏱️  Batch complete. Waiting 5 seconds before next batch...`);
        await delay(5000);
      }
    }

    const duration = Date.now() - startTime;
    const durationMinutes = Math.floor(duration / 60000);
    const durationSeconds = Math.floor((duration % 60000) / 1000);

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TRANSLATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`⏰ Duration: ${durationMinutes}m ${durationSeconds}s`);
    console.log(`📄 Total papers: ${papersWithoutTranslation.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📈 Success rate: ${((successCount / papersWithoutTranslation.length) * 100).toFixed(1)}%`);
    console.log('');

    // Print errors if any
    if (errors.length > 0) {
      console.log('❌ Failed translations:');
      errors.forEach(err => {
        console.log(`  - ${err}`);
      });
      console.log('');
    }

    console.log('✅ Translation script completed!');
    console.log('='.repeat(70));
    console.log('');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Handle errors and exit
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
