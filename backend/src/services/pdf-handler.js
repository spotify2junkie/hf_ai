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

      // Download PDF with proper timeout
      console.log(`🔄 Initiating fetch request...`);
      const response = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,*/*'
        }
      });

      console.log(`📡 Response received, status: ${response.status}`);

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

      // Stream to file instead of buffering in memory (better performance)
      // Track actual bytes written to enforce size limit even without content-length header
      const maxBytes = 100 * 1024 * 1024; // 100MB
      let bytesWritten = 0;

      console.log(`💾 Starting file stream to: ${filepath}`);

      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(filepath, {
          highWaterMark: 1024 * 1024 // 1MB buffer for faster writes
        });

        let cleanedUp = false;
        let totalTimeout = null;
        let stalledInterval = null;
        let lastDataTime = Date.now();

        const cleanup = () => {
          if (!cleanedUp) {
            cleanedUp = true;
            if (totalTimeout) clearTimeout(totalTimeout);
            if (stalledInterval) clearInterval(stalledInterval);
            fileStream.destroy();
            // Delete partially downloaded file
            try {
              if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
              }
            } catch (e) {
              console.error('Failed to cleanup partial file:', e.message);
            }
          }
        };

        // Total download timeout (60 seconds)
        totalTimeout = setTimeout(() => {
          console.error('❌ Download timeout after 60 seconds');
          cleanup();
          reject(new Error('Download timeout - took longer than 60 seconds'));
        }, 60000);

        // Check for stalled download every 2 seconds
        stalledInterval = setInterval(() => {
          const timeSinceLastData = Date.now() - lastDataTime;
          if (timeSinceLastData > 10000) {
            console.error(`❌ Download stalled - no data for ${timeSinceLastData}ms`);
            cleanup();
            reject(new Error('Download stalled - no data received for 10 seconds'));
          }
        }, 2000);

        console.log(`📥 Streaming data...`);

        // Listen to data events for progress tracking
        response.body.on('data', (chunk) => {
          lastDataTime = Date.now();
          bytesWritten += chunk.length;

          // Log progress every 1MB
          if (Math.floor(bytesWritten / (1024 * 1024)) > Math.floor((bytesWritten - chunk.length) / (1024 * 1024))) {
            const progressMB = (bytesWritten / (1024 * 1024)).toFixed(2);
            console.log(`📥 Downloaded: ${progressMB} MB`);
          }

          // Check size limit
          if (bytesWritten > maxBytes) {
            console.error(`❌ File too large: ${bytesWritten} bytes`);
            cleanup();
            reject(new Error(`PDF file too large (exceeded ${maxBytes / (1024 * 1024)}MB limit)`));
          }
        });

        // Pipe stream to file
        response.body.pipe(fileStream);

        response.body.on('error', (err) => {
          console.error('❌ Stream error:', err);
          cleanup();
          reject(new Error(`Download stream error: ${err.message}`));
        });

        fileStream.on('error', (err) => {
          console.error('❌ Write error:', err);
          cleanup();
          reject(new Error(`File write error: ${err.message}`));
        });

        fileStream.on('finish', () => {
          console.log(`✅ File stream finished, wrote ${bytesWritten} bytes`);
          if (totalTimeout) clearTimeout(totalTimeout);
          if (stalledInterval) clearInterval(stalledInterval);
          cleanedUp = true; // Prevent cleanup from deleting the file
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
