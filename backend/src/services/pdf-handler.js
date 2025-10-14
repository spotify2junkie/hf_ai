const fs = require('fs');
const path = require('path');
const axios = require('axios');
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

      // Validate it's an arxiv URL for security (strict hostname check)
      let url;
      try {
        url = new URL(pdfUrl);
      } catch (e) {
        throw new Error('Invalid PDF URL');
      }

      const allowedHosts = ['arxiv.org', 'www.arxiv.org', 'export.arxiv.org'];
      if (!allowedHosts.includes(url.hostname.toLowerCase())) {
        throw new Error(`Only arxiv.org PDFs are supported. Got: ${url.hostname}`);
      }

      // Must be a PDF file
      if (!url.pathname.toLowerCase().endsWith('.pdf')) {
        throw new Error('URL must point to a PDF file');
      }

      // Generate unique filename
      const filename = `paper_${uuidv4()}.pdf`;
      const filepath = path.join(this.tempDir, filename);

      // Download PDF with axios (better streaming support)
      console.log(`🔄 Starting download with axios...`);

      const maxBytes = 100 * 1024 * 1024; // 100MB
      let bytesWritten = 0;

      const response = await axios({
        method: 'GET',
        url: pdfUrl,
        responseType: 'stream',
        timeout: 60000, // 60 second timeout
        maxContentLength: maxBytes,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,*/*'
        }
      });

      console.log(`📡 Response received, status: ${response.status}`);

      // Get file size
      const contentLength = response.headers['content-length'];
      if (contentLength) {
        const sizeMB = parseInt(contentLength) / (1024 * 1024);
        console.log(`📊 PDF size: ${sizeMB.toFixed(2)} MB`);

        // Check file size limit (100MB)
        if (sizeMB > 100) {
          throw new Error('PDF file too large (max 100MB)');
        }
      }

      console.log(`💾 Streaming to file: ${filepath}`);

      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(filepath, {
          highWaterMark: 1024 * 1024 // 1MB buffer
        });

        let cleanedUp = false;
        let stalledTimeout = null;
        let lastDataTime = Date.now();

        const cleanup = () => {
          if (!cleanedUp) {
            cleanedUp = true;
            if (stalledTimeout) clearTimeout(stalledTimeout);
            fileStream.destroy();
            response.data.destroy();
            // Delete partial file
            try {
              if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
              }
            } catch (e) {
              console.error('Cleanup error:', e.message);
            }
          }
        };

        const resetStallTimeout = () => {
          if (stalledTimeout) clearTimeout(stalledTimeout);
          stalledTimeout = setTimeout(() => {
            console.error('❌ Download stalled - no data for 15 seconds');
            cleanup();
            reject(new Error('Download stalled'));
          }, 15000); // 15 second stall timeout
        };

        resetStallTimeout();

        // Track progress
        response.data.on('data', (chunk) => {
          lastDataTime = Date.now();
          bytesWritten += chunk.length;
          resetStallTimeout();

          // Log progress every 1MB
          if (Math.floor(bytesWritten / (1024 * 1024)) > Math.floor((bytesWritten - chunk.length) / (1024 * 1024))) {
            const progressMB = (bytesWritten / (1024 * 1024)).toFixed(2);
            console.log(`📥 Downloaded: ${progressMB} MB`);
          }
        });

        // Pipe to file
        response.data.pipe(fileStream);

        response.data.on('error', (err) => {
          console.error('❌ Stream error:', err);
          cleanup();
          reject(new Error(`Download error: ${err.message}`));
        });

        fileStream.on('error', (err) => {
          console.error('❌ Write error:', err);
          cleanup();
          reject(new Error(`File write error: ${err.message}`));
        });

        fileStream.on('finish', () => {
          if (stalledTimeout) clearTimeout(stalledTimeout);
          cleanedUp = true; // Mark as cleaned up to prevent file deletion
          console.log(`✅ Downloaded ${bytesWritten} bytes (${(bytesWritten / (1024 * 1024)).toFixed(2)} MB)`);
          resolve();
        });
      });

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
