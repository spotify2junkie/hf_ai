const axios = require('axios');

class HuggingFaceService {
  constructor() {
    this.baseURL = 'https://huggingface.co/api';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'User-Agent': 'Daily-Paper-Extractor/1.0'
      }
    });
  }

  /**
   * Fetch daily papers for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Array>} Array of paper objects
   */
  async fetchDailyPapers(date) {
    try {
      console.log(`📅 Fetching papers for date: ${date}`);

      const response = await this.client.get('/daily_papers', {
        params: { date }
      });

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format from HuggingFace API');
      }

      const papers = response.data.map(paper => ({
        title: paper.title || 'Untitled',
        authors: Array.isArray(paper.authors) ? paper.authors : [],
        abstract: paper.abstract || 'No abstract available',
        pdf_url: paper.pdf_url || paper.url || null,
        topics: Array.isArray(paper.topics) ? paper.topics : [],
        published_date: date
      }));

      console.log(`✅ Successfully fetched ${papers.length} papers`);
      return papers;

    } catch (error) {
      console.error('❌ Error fetching papers:', error.message);

      if (error.response) {
        // API returned an error
        throw new Error(`HuggingFace API error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        // Request timeout or network error
        throw new Error('Network error: Unable to reach HuggingFace API');
      } else {
        // Other error
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  /**
   * Validate date format (YYYY-MM-DD)
   * @param {string} date
   * @returns {boolean}
   */
  isValidDate(date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;

    const parsedDate = new Date(date);
    return parsedDate instanceof Date && !isNaN(parsedDate) && date === parsedDate.toISOString().split('T')[0];
  }
}

module.exports = new HuggingFaceService();