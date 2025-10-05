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
   * Stream analysis from DashScope
   * @param {string} fileId - File ID from DashScope
   * @param {object} res - Express response object for SSE
   */
  async streamAnalysis(fileId, res) {
    try {
      console.log(`🤖 Starting AI analysis for file: ${fileId}`);

      const response = await fetch(`${this.baseURL}/chat/completions`, {
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
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
      }

      console.log(`📡 Streaming response from DashScope...`);

      // Stream the response
      const reader = response.body;
      let buffer = '';

      reader.on('data', (chunk) => {
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
              return;
            }

            try {
              const parsed = JSON.parse(data);

              // Extract content from the response
              if (parsed.choices && parsed.choices[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;

                // Send chunk to client
                res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
              }

              // Check for finish_reason
              if (parsed.choices && parsed.choices[0]?.finish_reason) {
                console.log(`✅ Analysis complete. Reason: ${parsed.choices[0].finish_reason}`);
              }

            } catch (parseError) {
              // Ignore JSON parse errors for non-JSON lines
            }
          }
        });
      });

      reader.on('end', () => {
        console.log(`🏁 Stream ended`);
        res.write(`data: ${JSON.stringify({ status: 'complete' })}\n\n`);
      });

      reader.on('error', (error) => {
        console.error('❌ Stream error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      });

    } catch (error) {
      console.error('❌ DashScope analysis error:', error.message);
      throw new Error(`Failed to analyze paper: ${error.message}`);
    }
  }
}

module.exports = new DashScopeService();
