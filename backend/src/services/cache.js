const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Simple file-based cache for AI paper analyses
 * Stores analysis results to avoid re-processing the same papers
 */

class CacheService {
  constructor() {
    this.cacheDir = path.join(__dirname, '../../cache');
    this.locks = new Map(); // In-memory locks for preventing race conditions
    this.ensureCacheDir();
  }

  /**
   * Acquire lock for a paper ID
   * @param {string} key - Lock key
   * @returns {Promise<void>}
   */
  async acquireLock(key) {
    const maxWait = 30000; // 30 seconds max wait
    const startTime = Date.now();

    while (this.locks.has(key)) {
      if (Date.now() - startTime > maxWait) {
        throw new Error(`Lock timeout for ${key}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.locks.set(key, { acquired: Date.now() });
    console.log(`🔒 Lock acquired for ${key}`);
  }

  /**
   * Release lock for a paper ID
   * @param {string} key - Lock key
   */
  releaseLock(key) {
    if (this.locks.has(key)) {
      this.locks.delete(key);
      console.log(`🔓 Lock released for ${key}`);
    }
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

      // Check if file exists (async)
      try {
        await fsPromises.access(cachePath);
      } catch {
        return null; // File doesn't exist
      }

      // Check cache age (async)
      const stats = await fsPromises.stat(cachePath);
      const age = Date.now() - stats.mtimeMs;

      if (age > maxAge) {
        console.log(`⏰ Cache expired for ${paperId} (age: ${(age / 1000 / 60 / 60).toFixed(1)}h)`);
        // Delete expired cache (async)
        await fsPromises.unlink(cachePath).catch(() => {});
        return null;
      }

      // Read and return cached analysis (async)
      const content = await fsPromises.readFile(cachePath, 'utf8');
      const cached = JSON.parse(content);
      console.log(`✅ Cache hit for ${paperId} (age: ${(age / 1000 / 60 / 60).toFixed(1)}h)`);

      return cached.analysis;

    } catch (error) {
      console.error('⚠️  Cache read error:', error.message);
      return null;
    }
  }

  /**
   * Store analysis in cache with locking
   * @param {string} paperId - Paper identifier
   * @param {string} analysis - Analysis content
   * @returns {Promise<void>}
   */
  async set(paperId, analysis) {
    const lockKey = `write_${paperId}`;

    try {
      // Acquire lock to prevent concurrent writes
      await this.acquireLock(lockKey);

      const cacheKey = this.getCacheKey(paperId);
      const cachePath = path.join(this.cacheDir, cacheKey);

      const cacheData = {
        paperId,
        analysis,
        timestamp: new Date().toISOString(),
        cached_at: Date.now()
      };

      // Write file asynchronously (non-blocking)
      await fsPromises.writeFile(cachePath, JSON.stringify(cacheData, null, 2), 'utf8');
      console.log(`💾 Cached analysis for ${paperId} (${analysis.length} chars)`);

    } catch (error) {
      console.error('⚠️  Cache write error:', error.message);
      // Don't throw - caching is optional
    } finally {
      this.releaseLock(lockKey);
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
   * Store DashScope fileId for a paper
   * @param {string} paperId - Paper identifier
   * @param {string} fileId - DashScope file ID
   * @param {number} ttl - Time to live in milliseconds (default: 24 hours)
   */
  async setFileId(paperId, fileId, ttl = 24 * 60 * 60 * 1000) {
    const lockKey = `fileid_${paperId}`;

    try {
      await this.acquireLock(lockKey);

      const cacheKey = `fileid_${this.getCacheKey(paperId)}`;
      const cachePath = path.join(this.cacheDir, cacheKey);

      const cacheData = {
        paperId,
        fileId,
        timestamp: new Date().toISOString(),
        cached_at: Date.now(),
        expires_at: Date.now() + ttl
      };

      await fsPromises.writeFile(cachePath, JSON.stringify(cacheData, null, 2), 'utf8');
      console.log(`💾 Cached fileId for ${paperId}: ${fileId} (TTL: ${ttl/1000/60}min)`);

    } catch (error) {
      console.error('⚠️  FileId cache write error:', error.message);
    } finally {
      this.releaseLock(lockKey);
    }
  }

  /**
   * Get cached DashScope fileId for a paper
   * @param {string} paperId - Paper identifier
   * @returns {Promise<string|null>} - Cached fileId or null
   */
  async getFileId(paperId) {
    try {
      const cacheKey = `fileid_${this.getCacheKey(paperId)}`;
      const cachePath = path.join(this.cacheDir, cacheKey);

      // Check if file exists
      try {
        await fsPromises.access(cachePath);
      } catch {
        return null;
      }

      // Read cached fileId
      const content = await fsPromises.readFile(cachePath, 'utf8');
      const cached = JSON.parse(content);

      // Check expiration
      if (Date.now() > cached.expires_at) {
        console.log(`⏰ FileId expired for ${paperId}`);
        await fsPromises.unlink(cachePath).catch(() => {});
        return null;
      }

      const age = Date.now() - cached.cached_at;
      console.log(`✅ FileId cache hit for ${paperId} (age: ${(age / 1000 / 60).toFixed(1)}min)`);

      return cached.fileId;

    } catch (error) {
      console.error('⚠️  FileId cache read error:', error.message);
      return null;
    }
  }

  /**
   * Check if fileId is cached for a paper
   * @param {string} paperId - Paper identifier
   * @returns {Promise<boolean>}
   */
  async hasFileId(paperId) {
    const fileId = await this.getFileId(paperId);
    return fileId !== null;
  }

  /**
   * Clear cached fileId for a paper
   * @param {string} paperId - Paper identifier
   */
  async clearFileId(paperId) {
    try {
      const cacheKey = `fileid_${this.getCacheKey(paperId)}`;
      const cachePath = path.join(this.cacheDir, cacheKey);

      if (fs.existsSync(cachePath)) {
        await fsPromises.unlink(cachePath);
        console.log(`🗑️  Cleared fileId cache for ${paperId}`);
      }
    } catch (error) {
      console.error('⚠️  FileId cache clear error:', error.message);
    }
  }

  /**
   * Store translation for a paper abstract
   * @param {string} paperId - Paper identifier
   * @param {string} translation - Chinese translation
   * @param {number} ttl - Time to live in milliseconds (default: 7 days)
   */
  async setTranslation(paperId, translation, ttl = 7 * 24 * 60 * 60 * 1000) {
    const lockKey = `translation_${paperId}`;

    try {
      await this.acquireLock(lockKey);

      const cacheKey = `translation_${this.getCacheKey(paperId)}`;
      const cachePath = path.join(this.cacheDir, cacheKey);

      const cacheData = {
        paperId,
        translation,
        timestamp: new Date().toISOString(),
        cached_at: Date.now(),
        expires_at: Date.now() + ttl
      };

      await fsPromises.writeFile(cachePath, JSON.stringify(cacheData, null, 2), 'utf8');
      console.log(`💾 Cached translation for ${paperId} (${translation.length} chars, TTL: ${ttl/1000/60/60/24}days)`);

    } catch (error) {
      console.error('⚠️  Translation cache write error:', error.message);
    } finally {
      this.releaseLock(lockKey);
    }
  }

  /**
   * Get cached translation for a paper
   * @param {string} paperId - Paper identifier
   * @returns {Promise<string|null>} - Cached translation or null
   */
  async getTranslation(paperId) {
    try {
      const cacheKey = `translation_${this.getCacheKey(paperId)}`;
      const cachePath = path.join(this.cacheDir, cacheKey);

      // Check if file exists
      try {
        await fsPromises.access(cachePath);
      } catch {
        return null;
      }

      // Read cached translation
      const content = await fsPromises.readFile(cachePath, 'utf8');
      const cached = JSON.parse(content);

      // Check expiration
      if (Date.now() > cached.expires_at) {
        console.log(`⏰ Translation expired for ${paperId}`);
        await fsPromises.unlink(cachePath).catch(() => {});
        return null;
      }

      const age = Date.now() - cached.cached_at;
      console.log(`✅ Translation cache hit for ${paperId} (age: ${(age / 1000 / 60 / 60 / 24).toFixed(1)}days)`);

      return cached.translation;

    } catch (error) {
      console.error('⚠️  Translation cache read error:', error.message);
      return null;
    }
  }

  /**
   * Check if translation is cached for a paper
   * @param {string} paperId - Paper identifier
   * @returns {Promise<boolean>}
   */
  async hasTranslation(paperId) {
    const translation = await this.getTranslation(paperId);
    return translation !== null;
  }

  /**
   * Clear cached translation for a paper
   * @param {string} paperId - Paper identifier
   */
  async clearTranslation(paperId) {
    try {
      const cacheKey = `translation_${this.getCacheKey(paperId)}`;
      const cachePath = path.join(this.cacheDir, cacheKey);

      if (fs.existsSync(cachePath)) {
        await fsPromises.unlink(cachePath);
        console.log(`🗑️  Cleared translation cache for ${paperId}`);
      }
    } catch (error) {
      console.error('⚠️  Translation cache clear error:', error.message);
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
