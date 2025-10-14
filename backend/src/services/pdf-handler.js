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
      const response = await fetch(pdfUrl, {
        timeout: 30000, // 30 second connection timeout
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

      // Stream to file instead of buffering in memory (better performance)
      // Track actual bytes written to enforce size limit even without content-length header
      const maxBytes = 100 * 1024 * 1024; // 100MB
      let bytesWritten = 0;

      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(filepath);
        let cleanedUp = false;
        let downloadTimeout = null;
        let lastDataTime = Date.now();

        const cleanup = () => {
          if (!cleanedUp) {
            cleanedUp = true;
            if (downloadTimeout) clearTimeout(downloadTimeout);
            fileStream.close();
            // Delete partially downloaded file
            if (fs.existsSync(filepath)) {
              fs.unlinkSync(filepath);
            }
          }
        };

        // Set timeout for entire download (60 seconds)
        const totalTimeout = setTimeout(() => {
          cleanup();
          reject(new Error('Download timeout - took longer than 60 seconds'));
        }, 60000);

        // Check for stalled download (no data for 10 seconds)
        const checkStalled = setInterval(() => {
          const timeSinceLastData = Date.now() - lastDataTime;
          if (timeSinceLastData > 10000) {
            clearInterval(checkStalled);
            clearTimeout(totalTimeout);
            cleanup();
            reject(new Error('Download stalled - no data received for 10 seconds'));
          }
        }, 2000);

        downloadTimeout = { total: totalTimeout, stalled: checkStalled };

        response.body.on('data', (chunk) => {
          lastDataTime = Date.now();
          bytesWritten += chunk.length;

          // Log progress every 1MB
          if (bytesWritten % (1024 * 1024) < chunk.length) {
            const progressMB = (bytesWritten / (1024 * 1024)).toFixed(2);
            console.log(`📥 Downloaded: ${progressMB} MB`);
          }

          if (bytesWritten > maxBytes) {
            clearInterval(checkStalled);
            clearTimeout(totalTimeout);
            cleanup();
            reject(new Error(`PDF file too large (exceeded ${maxBytes / (1024 * 1024)}MB limit)`));
          }
        });

        response.body.pipe(fileStream);

        response.body.on('error', (err) => {
          clearInterval(checkStalled);
          clearTimeout(totalTimeout);
          cleanup();
          reject(new Error(`Download stream error: ${err.message}`));
        });

        fileStream.on('error', (err) => {
          clearInterval(checkStalled);
          clearTimeout(totalTimeout);
          cleanup();
          reject(new Error(`File write error: ${err.message}`));
        });

        fileStream.on('finish', () => {
          clearInterval(checkStalled);
          clearTimeout(totalTimeout);
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
