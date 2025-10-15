const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

/**
 * DashScope API Service
 * Handles interaction with Alibaba Cloud DashScope API for AI paper interpretation
 */

class DashScopeService {
  constructor() {
    // CRITICAL: API key must be provided via environment variable
    if (!process.env.DASHSCOPE_API_KEY) {
      throw new Error(
        'DASHSCOPE_API_KEY environment variable is required. ' +
        'Please set it in your .env file or environment.'
      );
    }
    this.apiKey = process.env.DASHSCOPE_API_KEY;
    this.baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

    // Analysis prompt template
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
   * Upload PDF file to DashScope
   * @param {string} filepath - Path to PDF file
   * @returns {Promise<string>} - File ID from DashScope
   */
  async uploadPDF(filepath) {
    try {
      console.log(`📤 Uploading PDF to DashScope: ${filepath}`);

      const form = new FormData();
      form.append('file', fs.createReadStream(filepath));
      form.append('purpose', 'file-extract');

      const response = await fetch(`${this.baseURL}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...form.getHeaders()
        },
        body: form
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ File uploaded successfully. File ID: ${data.id}`);
      console.log(`📊 File info:`, {
        id: data.id,
        filename: data.filename,
        bytes: data.bytes,
        status: data.status
      });

      return data.id;

    } catch (error) {
      console.error('❌ DashScope upload error:', error.message);
      throw new Error(`Failed to upload PDF to DashScope: ${error.message}`);
    }
  }

  /**
   * Stream Q&A response from DashScope
   * @param {string} fileId - File ID from DashScope
   * @param {string} question - User's question
   * @param {array} conversationHistory - Previous conversation messages
   * @param {object} res - Express response object for SSE
   * @param {number} timeout - Max time to wait in milliseconds (default: 60 seconds)
   */
  async streamQA(fileId, question, conversationHistory = [], res, timeout = 60000) {
    return new Promise(async (resolve, reject) => {
      let timeoutId = null;
      let isTimedOut = false;
      let streamEnded = false;
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

      try {
        console.log(`💬 Starting Q&A for file: ${fileId}`);
        console.log(`❓ Question: ${question.substring(0, 100)}...`);

        // Build messages array with conversation history
        const messages = [
          { role: 'system', content: 'You are a helpful assistant for academic paper analysis.' },
          { role: 'system', content: `fileid://${fileId}` }
        ];

        // Add conversation history (last 4 messages for context)
        const recentHistory = conversationHistory.slice(-4);
        messages.push(...recentHistory);

        // Add current question
        messages.push({ role: 'user', content: question });

        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: abortController.signal,
          body: JSON.stringify({
            model: 'qwen-long',
            messages: messages,
            stream: true,
            stream_options: {
              include_usage: true
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Q&A failed: ${response.status} - ${errorText}`);
        }

        console.log(`📡 Streaming Q&A response...`);

        // Set timeout
        timeoutId = setTimeout(() => {
          if (streamEnded) return;

          isTimedOut = true;
          streamEnded = true;
          console.log(`⏱️  Q&A timeout reached (${timeout/1000}s)`);

          safeWrite(`data: ${JSON.stringify({ status: 'timeout', message: 'Response timeout' })}\n\n`);

          try {
            abortController.abort();
          } catch (e) {
            console.error('⚠️  Error aborting stream:', e.message);
          }

          resolve();
        }, timeout);

        // Stream the response
        const reader = response.body;
        let buffer = '';

        reader.on('data', (chunk) => {
          if (isTimedOut || streamEnded) return;

          const text = chunk.toString();
          buffer += text;

          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          lines.forEach(line => {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                return;
              }

              try {
                const parsed = JSON.parse(data);

                if (parsed.choices && parsed.choices[0]?.delta?.content) {
                  const content = parsed.choices[0].delta.content;
                  safeWrite(`data: ${JSON.stringify({ chunk: content })}\n\n`);
                }

                if (parsed.choices && parsed.choices[0]?.finish_reason) {
                  console.log(`✅ Q&A complete. Reason: ${parsed.choices[0].finish_reason}`);
                }

              } catch (parseError) {
                // Ignore parse errors
              }
            }
          });
        });

        reader.on('end', () => {
          if (isTimedOut || streamEnded) return;

          streamEnded = true;
          clearTimeout(timeoutId);
          console.log(`🏁 Q&A stream ended`);

          safeWrite(`data: ${JSON.stringify({ status: 'complete' })}\n\n`);
          resolve();
        });

        reader.on('error', (error) => {
          if (streamEnded) return;

          streamEnded = true;
          clearTimeout(timeoutId);
          console.error('❌ Q&A stream error:', error);

          safeWrite(`data: ${JSON.stringify({ error: error.message })}\n\n`);
          reject(error);
        });

      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        console.error('❌ DashScope Q&A error:', error.message);
        reject(new Error(`Failed to process Q&A: ${error.message}`));
      }
    });
  }

  /**
   * Stream analysis from DashScope
   * @param {string} fileId - File ID from DashScope
   * @param {object} res - Express response object for SSE
   * @param {number} warningTimeout - Time before showing "taking longer" warning (default: 10 seconds)
   */
  async streamAnalysis(fileId, res, warningTimeout = 10000) {
    return new Promise((resolve, reject) => {
      let warningTimeoutId = null;
      let streamEnded = false;
      let hasReceivedData = false;
      let chunkCount = 0;

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

      console.log(`🤖 Starting AI analysis for file: ${fileId}`);
      console.log(`⏰ Promise created, waiting for stream to complete...`);

      // Make the fetch request
      fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen-long',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'system', content: `fileid://${fileId}` },
            { role: 'user', content: this.analysisPrompt }
          ],
          stream: true,
          stream_options: {
            include_usage: true
          }
        })
      })
      .then(response => {
        console.log(`📥 Received response from DashScope, status: ${response.status}`);

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

                // Extract content from the response
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

      })
      .catch(error => {
        console.log(`💥 Catch block triggered!`);
        cleanup();
        console.error('❌ DashScope analysis error:', error.message);
        reject(new Error(`Failed to analyze paper: ${error.message}`));
      });
    });
  }
}

module.exports = new DashScopeService();
