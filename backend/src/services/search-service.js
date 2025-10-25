/**
 * Search Service
 *
 * Provides fuzzy search functionality for papers using Fuse.js.
 * Searches across topics field with configurable relevance scoring.
 */

const Fuse = require('fuse.js');
const prisma = require('./prisma');
const papersCacheService = require('./papers-cache');

class SearchService {
  constructor() {
    // Fuse.js configuration for optimal topic matching
    this.fuseOptions = {
      keys: ['topics'],
      threshold: 0.3, // 0 = exact match, 1 = match anything
      includeScore: true, // Include match score in results
      minMatchCharLength: 2, // Minimum characters to match
      ignoreLocation: true, // Don't care where in the string the match is
      distance: 100, // How far from start to search
      useExtendedSearch: false, // Don't need extended search syntax
      findAllMatches: true, // Find all matching tokens
    };

    this.MAX_SEARCH_RESULTS = 100; // Limit to top 100 matches before pagination
  }

  /**
   * Search papers by topics using fuzzy search
   * @param {string} query - Search query
   * @param {number} page - Page number (1-indexed)
   * @param {number} limit - Results per page
   * @returns {Promise<Object>} Search results with pagination and metadata
   */
  async searchPapers(query, page = 1, limit = 10) {
    const startTime = Date.now();

    try {
      // Validate input
      if (!query || typeof query !== 'string') {
        throw new Error('Query must be a non-empty string');
      }

      if (query.length < 2) {
        throw new Error('Query must be at least 2 characters long');
      }

      if (query.length > 200) {
        throw new Error('Query must be at most 200 characters long');
      }

      if (page < 1) {
        throw new Error('Page must be at least 1');
      }

      if (limit < 1 || limit > 50) {
        throw new Error('Limit must be between 1 and 50');
      }

      // Fetch all valid cached papers from database
      const now = new Date();
      const cachedPapers = await prisma.paper.findMany({
        where: {
          cacheExpiresAt: {
            gte: now, // Only papers with valid cache
          },
        },
        orderBy: [
          { upvotes: 'desc' },
          { title: 'asc' },
        ],
      });

      console.log(
        `[Search] Found ${cachedPapers.length} cached papers to search through`
      );

      // Transform database papers to API format
      const papers = cachedPapers.map((paper) =>
        papersCacheService.transformPaperFromDb(paper)
      );

      if (papers.length === 0) {
        return this._buildEmptyResponse(query, page, limit, startTime);
      }

      // Perform fuzzy search using Fuse.js
      const fuse = new Fuse(papers, this.fuseOptions);
      const searchResults = fuse.search(query);

      console.log(
        `[Search] Found ${searchResults.length} matches for query: "${query}"`
      );

      // Limit to top 100 results for performance
      const limitedResults = searchResults.slice(0, this.MAX_SEARCH_RESULTS);

      // Extract papers with match scores
      const papersWithScores = limitedResults.map((result) => ({
        ...result.item,
        matchScore: this._normalizeScore(result.score), // Convert to 0-100 scale
        rawScore: result.score,
      }));

      // Apply pagination
      const totalResults = papersWithScores.length;
      const totalPages = Math.ceil(totalResults / limit);
      const offset = (page - 1) * limit;
      const paginatedPapers = papersWithScores.slice(offset, offset + limit);

      const executionTime = Date.now() - startTime;

      return {
        query: query,
        results: paginatedPapers,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalResults: totalResults,
          totalPages: totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        searchMetadata: {
          executionTime: executionTime,
          searchedPapers: papers.length,
          threshold: this.fuseOptions.threshold,
          maxResults: this.MAX_SEARCH_RESULTS,
        },
      };
    } catch (error) {
      console.error('[Search] Error searching papers:', error);
      throw error;
    }
  }

  /**
   * Normalize Fuse.js score (0-1 where 0 is best) to 0-100 scale (100 is best)
   * @param {number} fuseScore - Fuse.js score (0-1)
   * @returns {number} Normalized score (0-100)
   */
  _normalizeScore(fuseScore) {
    // Fuse scores: 0 = perfect match, 1 = worst match
    // Normalize to: 100 = perfect match, 0 = worst match
    return Math.round((1 - fuseScore) * 100);
  }

  /**
   * Build empty response when no papers found
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @param {number} limit - Results per page
   * @param {number} startTime - Search start timestamp
   * @returns {Object} Empty search response
   */
  _buildEmptyResponse(query, page, limit, startTime) {
    const executionTime = Date.now() - startTime;

    return {
      query: query,
      results: [],
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalResults: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      searchMetadata: {
        executionTime: executionTime,
        searchedPapers: 0,
        threshold: this.fuseOptions.threshold,
        maxResults: this.MAX_SEARCH_RESULTS,
      },
    };
  }

  /**
   * Get search service configuration
   * @returns {Object} Service configuration
   */
  getConfig() {
    return {
      fuseOptions: this.fuseOptions,
      maxSearchResults: this.MAX_SEARCH_RESULTS,
    };
  }
}

module.exports = new SearchService();
