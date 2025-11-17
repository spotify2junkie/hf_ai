const fs = require('fs');
const fetch = require('node-fetch');

/**
 * SiliconFlow API Service
 * Handles interaction with SiliconFlow API for AI paper explanation using base64 PDF encoding
 */

class SiliconFlowService {
  constructor() {
    // CRITICAL: API key must be provided via environment variable
    if (!process.env.SILICONFLOW_API_KEY) {
      throw new Error(
        'SILICONFLOW_API_KEY environment variable is required. ' +
        'Please set it in your .env file or environment.'
      );
    }
    this.apiKey = process.env.SILICONFLOW_API_KEY;
    this.baseURL = 'https://api.siliconflow.cn/v1';
    this.model = process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

    // Analysis prompt template (same as DashScope)
    this.analysisPrompt = `帮我详细解释一下这篇文章，包括以下部分
1. 论文核心概念🔍（对论文核心 insight 的简要总结）
2. 论文内名词解释🧐（对论文中出现多次，或者比较重要的名词的详细解释）
3. 论文方法🔬
3.1 过去方法的问题 （顺便引出方法的 motivation）
3.2 整体框架（整个论文的方法部分的核心流程的超详细说明，需要保证通过说明可以完整复现出整个方法，包括细节，公式流程，变量说明）
3.3 核心难点解析 （将方法中比较复杂的部分或者比较关键的部分在这里进行更加直白易懂的解释）
4. 实验结果与分析📊
4.1 实验设置（数据集，模型，指标，超参数设置，对比方法等的内容）
4.2 实验结果（该方法指标提升了多少，以及其他相关效果或正面的评价）
5. 结论💎
5.1 论文的贡献
5.2 论文的限制（论文在哪些方面有问题）
5.3 未来的方向（未来可能的发展方向）
注意：
1. 在最开头加上一个一级标题作为文章的简单标记，让我在后续回顾的时候能根据标记快速回想起这篇文章的特点，例如 GQE-PRF：基于伪相关反馈的生成式查询扩展
2. 请你对 x. 这类使用二级标题，对 x.x 使用三级标题，除了上述说明外其他所有内容都不要使用标题加粗，但可以使用序号进行罗列
3. 注意对于较长的公式你需要将其分为多行公式，这样更清晰，方便我理解 (即公式内容不变，但从某个运算符号进行切分并展示为多行)`;
  }

  /**
   * Convert PDF file to base64 data URL
   * @param {string} filepath - Path to PDF file
   * @returns {Promise<string>} - Base64 data URL
   */
  async pdfToBase64DataURL(filepath) {
    try {
      console.log(`📄 Converting PDF to base64: ${filepath}`);

      // Check file size (limit to 10MB for safety)
      const stats = fs.statSync(filepath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      if (fileSizeInMB > 10) {
        throw new Error(`PDF file too large: ${fileSizeInMB.toFixed(2)}MB (max 10MB)`);
      }

      // Read file and convert to base64
      const pdfBuffer = fs.readFileSync(filepath);
      const base64String = pdfBuffer.toString('base64');
      const dataURL = `data:application/pdf;base64,${base64String}`;

      console.log(`✅ PDF converted to base64 (${fileSizeInMB.toFixed(2)}MB → ${(dataURL.length / 1024 / 1024).toFixed(2)}MB encoded)`);

      return dataURL;
    } catch (error) {
      console.error('❌ PDF to base64 conversion error:', error.message);
      throw new Error(`Failed to convert PDF to base64: ${error.message}`);
    }
  }

  /**
   * Stream paper analysis from SiliconFlow API
   * @param {string} pdfBase64DataURL - Base64 encoded PDF data URL
   * @param {object} res - Express response object for SSE
   * @param {number} warningTimeout - Time before showing "taking longer" warning (default: 10 seconds)
   */
  async streamAnalysis(pdfBase64DataURL, res, warningTimeout = 10000) {
    return new Promise((resolve, reject) => {
      let warningTimeoutId = null;
      let streamEnded = false;
      let hasReceivedData = false;
      let chunkCount = 0;
      const abortController = new AbortController();

      // Helper to safely write to response
      const safeWrite = (data) => {
        if (!res.finished && res.writable && !streamEnded) {
          try {
            res.write(data);
            return true;
          } catch (e) {
            console.error('⚠️  Failed to write to response:', e.message);
            return false;
          }
        }
        return false;
      };

      const cleanup = () => {
        if (warningTimeoutId) {
          clearTimeout(warningTimeoutId);
          warningTimeoutId = null;
        }
      };

      console.log(`🤖 Starting AI analysis with SiliconFlow (${this.model})`);
      console.log(`⏰ Promise created, waiting for stream to complete...`);

      // Make the fetch request
      fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: abortController.signal,
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: pdfBase64DataURL
                  }
                },
                {
                  type: 'text',
                  text: `<image>\n<|grounding|>Convert the document to markdown.\n\n${this.analysisPrompt}`
                }
              ]
            }
          ],
          stream: true,
          max_tokens: 16000,
          temperature: 0.7,
          top_p: 0.9
        })
      })
      .then(response => {
        console.log(`📥 Received response from SiliconFlow, status: ${response.status}`);

        if (!response.ok) {
          return response.text().then(errorText => {
            throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
          });
        }

        console.log(`📡 Setting up stream handlers...`);

        // Set warning timeout - just notify, don't abort
        warningTimeoutId = setTimeout(() => {
          if (streamEnded || hasReceivedData) return;

          console.log(`⏱️  Still waiting for first response (${warningTimeout/1000}s)...`);
          safeWrite(`data: ${JSON.stringify({ status: 'slow', message: 'Analysis is taking longer than expected, please wait...' })}\n\n`);
        }, warningTimeout);

        // Get the readable stream
        const reader = response.body;
        console.log(`📖 Got response.body stream:`, reader ? 'EXISTS' : 'NULL');

        if (!reader) {
          throw new Error('No response body stream available');
        }

        let buffer = '';

        // Set up data handler
        console.log(`🔧 Attaching 'data' event handler...`);
        reader.on('data', (chunk) => {
          if (streamEnded) {
            console.warn('⚠️  Received data after stream ended');
            return;
          }

          const text = chunk.toString();
          buffer += text;

          // Split by double newline (SSE format)
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || ''; // Keep incomplete chunk in buffer

          lines.forEach(line => {
            if (line.startsWith('data: ')) {
              const data = line.slice(6); // Remove 'data: ' prefix

              // Skip [DONE] message
              if (data === '[DONE]') {
                console.log('📝 Received [DONE] marker');
                return;
              }

              try {
                const parsed = JSON.parse(data);

                // Extract content from the response (SiliconFlow format)
                if (parsed.choices && parsed.choices[0]?.delta?.content) {
                  const content = parsed.choices[0].delta.content;
                  chunkCount++;

                  // Mark that we've received data
                  if (!hasReceivedData) {
                    hasReceivedData = true;
                    console.log(`✅ First chunk received (${content.length} chars)`);
                    // Clear warning timeout since data is flowing
                    if (warningTimeoutId) {
                      clearTimeout(warningTimeoutId);
                      warningTimeoutId = null;
                    }
                  }

                  // Log every 10th chunk or first 5 chunks
                  if (chunkCount <= 5 || chunkCount % 10 === 0) {
                    console.log(`📝 Chunk #${chunkCount} (${content.length} chars): ${content.substring(0, 30)}...`);
                  }

                  // Use safe write helper
                  const written = safeWrite(`data: ${JSON.stringify({ chunk: content })}\n\n`);
                  if (!written) {
                    console.error(`❌ Failed to write chunk #${chunkCount} to response!`);
                  } else {
                    // Force flush to prevent 512-byte buffering
                    if (res.flush) res.flush();
                  }
                }

                // Check for finish_reason
                if (parsed.choices && parsed.choices[0]?.finish_reason) {
                  console.log(`✅ Received finish_reason: ${parsed.choices[0].finish_reason}`);
                }

              } catch (parseError) {
                // Ignore JSON parse errors for non-JSON lines
                console.warn('⚠️  Failed to parse SSE data:', data.substring(0, 100));
              }
            }
          });
        });

        // Set up end handler
        console.log(`🔧 Attaching 'end' event handler...`);
        reader.on('end', () => {
          console.log(`🎬 'end' event fired!`);

          if (streamEnded) {
            console.warn('⚠️  end event fired multiple times');
            return;
          }

          streamEnded = true;
          cleanup();
          console.log(`🏁 Stream ended naturally after ${chunkCount} chunks`);

          // Send completion status
          const written = safeWrite(`data: ${JSON.stringify({ status: 'complete' })}\n\n`);
          if (written) {
            console.log('✅ Sent complete status to client');
            // Force flush to ensure status is sent immediately
            if (res.flush) res.flush();
          } else {
            console.error('❌ Failed to send complete status to client');
          }

          // Small delay to ensure data is flushed before resolving
          // This prevents res.end() from being called too quickly
          setTimeout(() => {
            console.log('🔚 Resolving streamAnalysis promise');
            resolve();
          }, 100);
        });

        // Set up error handler
        console.log(`🔧 Attaching 'error' event handler...`);
        reader.on('error', (error) => {
          console.log(`⚠️  'error' event fired!`);

          if (streamEnded) {
            console.warn('⚠️  Error event fired after stream ended');
            return;
          }

          streamEnded = true;
          cleanup();
          console.error('❌ Stream error:', error);

          safeWrite(`data: ${JSON.stringify({ error: error.message })}\n\n`);
          reject(error);
        });

        console.log(`✅ All event handlers attached, stream should start flowing...`);
        // Event handlers will call resolve()/reject() from outer Promise
        // No return needed - .then() completes, but outer Promise stays open

      })
      .catch(error => {
        console.log(`💥 Catch block triggered!`);
        cleanup();
        console.error('❌ SiliconFlow analysis error:', error.message);
        reject(new Error(`Failed to analyze paper: ${error.message}`));
      });
    });
  }
}

module.exports = new SiliconFlowService();
