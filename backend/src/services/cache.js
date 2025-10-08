const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Simple file-based cache for AI paper analyses
 * Stores analysis results to avoid re-processing the same papers
 */

class CacheService {
  constructor() {
    this.cacheDir = path.join(__dirname, '../../cache');
    this.ensureCacheDir();
  }

  /**
   * Ensure cache directory exists
   */
  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      console.log(`📦 Created cache directory: ${this.cacheDir}`);
    }
  }

  /**
   * Generate cache key from paper ID
   * @param {string} paperId - Paper identifier
   * @returns {string} - Cache filename
   */
  getCacheKey(paperId) {
    // Create hash of paper ID for consistent filenames
    const hash = crypto.createHash('md5').update(paperId).digest('hex');
    return `analysis_${hash}.json`;
  }

  /**
   * Get cached analysis if available and not expired
   * @param {string} paperId - Paper identifier
   * @param {number} maxAge - Max age in milliseconds (default: 48 hours)
   * @returns {Promise<string|null>} - Cached analysis or null
   */
  async get(paperId, maxAge = 48 * 60 * 60 * 1000) {
    try {
      const cacheKey = this.getCacheKey(paperId);
      const cachePath = path.join(this.cacheDir, cacheKey);

      if (!fs.existsSync(cachePath)) {
        return null;
      }

      // Check cache age
      const stats = fs.statSync(cachePath);
      const age = Date.now() - stats.mtimeMs;

      if (age > maxAge) {
        console.log(`⏰ Cache expired for ${paperId} (age: ${(age / 1000 / 60 / 60).toFixed(1)}h)`);
        // Delete expired cache
        fs.unlinkSync(cachePath);
        return null;
      }

      // Read and return cached analysis
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      console.log(`✅ Cache hit for ${paperId} (age: ${(age / 1000 / 60 / 60).toFixed(1)}h)`);

      return cached.analysis;

    } catch (error) {
      console.error('⚠️  Cache read error:', error.message);
      return null;
    }
  }

  /**
   * Store analysis in cache
   * @param {string} paperId - Paper identifier
   * @param {string} analysis - Analysis content
   * @returns {Promise<void>}
   */
  async set(paperId, analysis) {
    try {
      const cacheKey = this.getCacheKey(paperId);
      const cachePath = path.join(this.cacheDir, cacheKey);

      const cacheData = {
        paperId,
        analysis,
        timestamp: new Date().toISOString(),
        cached_at: Date.now()
      };

      fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), 'utf8');
      console.log(`💾 Cached analysis for ${paperId}`);

    } catch (error) {
      console.error('⚠️  Cache write error:', error.message);
      // Don't throw - caching is optional
    }
  }

  /**
   * Check if analysis is cached
   * @param {string} paperId - Paper identifier
   * @returns {Promise<boolean>}
   */
  async has(paperId) {
    const cached = await this.get(paperId);
    return cached !== null;
  }

  /**
   * Clear specific cache entry
   * @param {string} paperId - Paper identifier
   */
  async clear(paperId) {
    try {
      const cacheKey = this.getCacheKey(paperId);
      const cachePath = path.join(this.cacheDir, cacheKey);

      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
        console.log(`🗑️  Cleared cache for ${paperId}`);
      }
    } catch (error) {
      console.error('⚠️  Cache clear error:', error.message);
    }
  }

  /**
   * Clear all cache entries older than specified age
   * @param {number} maxAge - Max age in milliseconds (default: 48 hours)
   */
  async clearOld(maxAge = 48 * 60 * 60 * 1000) {
    try {
      const files = fs.readdirSync(this.cacheDir);
      const now = Date.now();
      let cleared = 0;

      files.forEach(file => {
        const filepath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filepath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filepath);
          cleared++;
        }
      });

      if (cleared > 0) {
        console.log(`🗑️  Cleared ${cleared} old cache entries`);
      }

    } catch (error) {
      console.error('⚠️  Failed to clear old cache:', error.message);
    }
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache stats
   */
  async stats() {
    try {
      const files = fs.readdirSync(this.cacheDir);
      const now = Date.now();
      let totalSize = 0;
      let oldestAge = 0;
      let newestAge = Infinity;

      files.forEach(file => {
        const filepath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filepath);
        const age = now - stats.mtimeMs;

        totalSize += stats.size;
        oldestAge = Math.max(oldestAge, age);
        newestAge = Math.min(newestAge, age);
      });

      return {
        entries: files.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        oldestAgeHours: (oldestAge / 1000 / 60 / 60).toFixed(1),
        newestAgeHours: files.length > 0 ? (newestAge / 1000 / 60 / 60).toFixed(1) : 0
      };

    } catch (error) {
      console.error('⚠️  Failed to get cache stats:', error.message);
      return { entries: 0 };
    }
  }
}

module.exports = new CacheService();
