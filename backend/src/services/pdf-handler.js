const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

/**
 * PDF Handler Service
 * Handles PDF download and file management for AI interpretation
 */

class PDFHandler {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
    this.ensureTempDir();
  }

  /**
   * Ensure temp directory exists
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      console.log(`📁 Created temp directory: ${this.tempDir}`);
    }
  }

  /**
   * Download PDF from URL to temporary storage
   * @param {string} pdfUrl - URL of the PDF to download
   * @returns {Promise<string>} - Path to downloaded file
   */
  async downloadPDF(pdfUrl) {
    try {
      console.log(`⬇️  Downloading PDF from: ${pdfUrl}`);

      // Validate URL
      if (!pdfUrl || typeof pdfUrl !== 'string') {
        throw new Error('Invalid PDF URL');
      }

      // Validate it's an arxiv URL for security
      if (!pdfUrl.includes('arxiv.org')) {
        throw new Error('Only arxiv.org PDFs are supported');
      }

      // Generate unique filename
      const filename = `paper_${uuidv4()}.pdf`;
      const filepath = path.join(this.tempDir, filename);

      // Download PDF
      const response = await fetch(pdfUrl, {
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'Daily-Paper-Extractor/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
      }

      // Get file size
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const sizeMB = parseInt(contentLength) / (1024 * 1024);
        console.log(`📊 PDF size: ${sizeMB.toFixed(2)} MB`);

        // Check file size limit (100MB)
        if (sizeMB > 100) {
          throw new Error('PDF file too large (max 100MB)');
        }
      }

      // Write to file
      const buffer = await response.buffer();
      fs.writeFileSync(filepath, buffer);

      console.log(`✅ PDF downloaded successfully: ${filepath}`);
      return filepath;

    } catch (error) {
      console.error('❌ PDF download error:', error.message);
      throw new Error(`PDF download failed: ${error.message}`);
    }
  }

  /**
   * Clean up temporary file
   * @param {string} filepath - Path to file to delete
   */
  cleanupFile(filepath) {
    try {
      if (filepath && fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`🗑️  Cleaned up file: ${filepath}`);
      }
    } catch (error) {
      console.error('⚠️  Failed to cleanup file:', error.message);
    }
  }

  /**
   * Clean up all old temp files (older than 1 hour)
   */
  cleanupOldFiles() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      files.forEach(file => {
        const filepath = path.join(this.tempDir, file);
        const stats = fs.statSync(filepath);

        if (now - stats.mtimeMs > oneHour) {
          fs.unlinkSync(filepath);
          console.log(`🗑️  Cleaned up old file: ${file}`);
        }
      });
    } catch (error) {
      console.error('⚠️  Failed to cleanup old files:', error.message);
    }
  }
}

module.exports = new PDFHandler();
