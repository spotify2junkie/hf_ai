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

      const papers = response.data.map(item => {
        // Extract data from the actual HuggingFace API format
        const paperData = item.paper || {};
        const title = item.title || paperData.title || 'Untitled';
        const summary = item.summary || paperData.summary || 'No abstract available';

        // Extract author names from the complex author structure
        const authors = [];
        if (Array.isArray(paperData.authors)) {
          paperData.authors.forEach(author => {
            if (author.name) {
              authors.push(author.name);
            } else if (author.user && author.user.fullname) {
              authors.push(author.user.fullname);
            }
          });
        }

        // Construct PDF URL from paper ID (arxiv format)
        let pdfUrl = null;
        if (paperData.id) {
          pdfUrl = `https://arxiv.org/pdf/${paperData.id}.pdf`;
        }

        // Extract topics/keywords from AI keywords
        // Priority: paper.ai_keywords > [] (empty array)
        let topics = [];

        // Check for ai_keywords in paper object
        if (paperData.ai_keywords && Array.isArray(paperData.ai_keywords)) {
          topics = paperData.ai_keywords;
          console.log(`  ✅ Found ${topics.length} AI keywords for paper: ${paperData.id}`);
        } else {
          console.log(`  ⚠️  No AI keywords found for paper: ${paperData.id}`);
        }

        return {
          title: title,
          authors: authors,
          abstract: summary,
          pdf_url: pdfUrl,
          topics: topics,
          published_date: date,
          paper_id: paperData.id || null,
          upvotes: paperData.upvotes || item.upvotes || 0
        };
      });

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