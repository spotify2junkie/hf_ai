# AI Paper Interpretation Feature

## Overview

The AI Paper Interpretation feature provides on-demand, detailed analysis of academic papers using Alibaba Cloud's DashScope (Qwen-Long model). Analysis is **lazy-loaded** - it only runs when users explicitly click the "AI Interpret" button.

## Architecture

### Backend Flow
1. **User clicks "AI Interpret"** → Frontend sends POST request
2. **Backend validates** → Checks URL, paper ID, security constraints
3. **Download PDF** → Streams PDF from arXiv.org (max 100MB)
4. **Upload to DashScope** → Sends PDF to AI service for processing
5. **Stream analysis** → Real-time SSE streaming of AI response
6. **Cleanup** → Automatic deletion of temporary PDF file

### Key Components

#### Backend Services
- **`backend/src/services/dashscope.js`** - DashScope API integration
  - PDF upload to AI service
  - Streaming analysis via SSE
  - Structured Chinese prompt for detailed paper analysis

- **`backend/src/services/pdf-handler.js`** - PDF management
  - Downloads PDFs from arXiv
  - File size validation (100MB limit)
  - Automatic cleanup of temp files
  - Security: Only allows arxiv.org URLs

- **`backend/src/routes/ai-interpretation.js`** - Express endpoint
  - POST `/api/ai-interpretation` - Start analysis (SSE streaming)
  - GET `/api/ai-interpretation/health` - Health check
  - Rate limiting: 10 requests/hour per IP

#### Frontend Components
- **`frontend/src/components/AIInterpretationModal.tsx`** - React modal
  - SSE stream consumer
  - Real-time content rendering
  - Status tracking (downloading, uploading, analyzing)
  - Markdown rendering with syntax highlighting

## Security Features

✅ **Input Validation**
- Strict URL validation (arxiv.org only)
- File size limits enforced during download
- Input sanitization for paper titles/IDs

✅ **Rate Limiting**
- General API: 100 requests/15min
- AI interpretation: 10 requests/hour (resource intensive)

✅ **Resource Management**
- Temporary PDFs auto-deleted after processing
- Cleanup on errors and client disconnect
- Old files cleaned up (>1 hour)

✅ **API Key Protection**
- Environment variable only (never hardcoded)
- Authorization header sanitized in logs
- Startup validation warns if missing

## Setup

### 1. Get DashScope API Key
Visit https://dashscope.aliyun.com/ and create an account to get your API key.

### 2. Configure Environment
```bash
# backend/.env
DASHSCOPE_API_KEY=sk-your-actual-key-here
```

### 3. Start Services
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 4. Test Feature
1. Open http://localhost:3000
2. Select a date and load papers
3. Click "AI Interpret" on any paper
4. Watch real-time analysis stream in

## Analysis Structure

The AI provides a comprehensive breakdown in Chinese:

### 1. 论文核心概念 🔍
Brief summary of the paper's core insights

### 2. 论文内名词解释 🧐
Detailed explanations of key terminology

### 3. 论文方法 🔬
- **3.1** Past approaches and problems (motivation)
- **3.2** Overall framework (detailed methodology)
- **3.3** Core complexity analysis

### 4. 实验结果与分析 📊
- **4.1** Experimental setup
- **4.2** Results and improvements

### 5. 结论 💎
- **5.1** Contributions
- **5.2** Limitations
- **5.3** Future directions

## API Reference

### POST /api/ai-interpretation

Start AI interpretation of a paper.

**Request:**
```json
{
  "pdf_url": "https://arxiv.org/pdf/2410.00907.pdf",
  "paper_id": "2410.00907",
  "paper_title": "Addition is All You Need for Energy-efficient Language Models"
}
```

**Response:** Server-Sent Events (SSE) stream

**Status messages:**
```json
{"status": "downloading"}  // Fetching PDF
{"status": "uploading"}    // Sending to AI
{"status": "analyzing"}    // Processing (2-3 min)
{"status": "complete"}     // Done
```

**Content chunks:**
```json
{"chunk": "论文的第一部分..."}
```

**Errors:**
```json
{"error": "Failed to download PDF", "status": "error"}
```

### GET /api/ai-interpretation/health

Check service health.

**Response:**
```json
{
  "service": "ai-interpretation",
  "status": "OK",
  "dashscope_configured": true,
  "timestamp": "2025-10-08T12:00:00.000Z"
}
```

## Performance Considerations

### Current Implementation
- ✅ Lazy loading (on-demand only)
- ✅ SSE streaming (real-time updates)
- ✅ Automatic cleanup
- ✅ Rate limiting
- ✅ Connection keep-alive (30s heartbeat)

### Recommended Enhancements
1. **Caching** - Store analyses for 24-48 hours
2. **Queue system** - Handle concurrent requests (Bull + Redis)
3. **Monitoring** - Track duration, errors, rate limits
4. **Webhooks** - Async processing for long analyses

## Error Handling

### Common Errors

**"DASHSCOPE_API_KEY environment variable is required"**
- Solution: Add API key to backend/.env

**"Only arxiv.org PDFs are allowed"**
- Solution: Feature only supports arXiv papers for security

**"PDF file too large (max 100MB)"**
- Solution: Paper exceeds size limit, cannot process

**"Failed to download PDF: 404"**
- Solution: PDF not found on arXiv (wrong paper_id)

**"Analysis failed: 401"**
- Solution: Invalid DashScope API key

**"Too many requests"**
- Solution: Rate limit hit, wait before retrying

## Testing

### Manual Testing
```bash
# 1. Check health
curl http://localhost:3001/api/ai-interpretation/health

# 2. Start analysis (opens SSE stream)
curl -X POST http://localhost:3001/api/ai-interpretation \
  -H "Content-Type: application/json" \
  -d '{
    "pdf_url": "https://arxiv.org/pdf/2410.00907.pdf",
    "paper_id": "2410.00907",
    "paper_title": "Test Paper"
  }'
```

### Integration Testing
Use frontend to test complete flow:
1. Load papers for a recent date
2. Click "AI Interpret" on top paper
3. Verify streaming works
4. Check markdown rendering
5. Close modal and verify cleanup

## Monitoring

### Backend Logs
```bash
🚀 Starting AI interpretation for paper:
   Title: Addition is All You Need...
   ID: 2410.00907
⬇️  Downloading PDF from: https://arxiv.org/pdf/2410.00907.pdf
📊 PDF size: 2.35 MB
✅ PDF downloaded successfully
📤 Uploading PDF to DashScope
✅ File uploaded successfully. File ID: file-xyz123
🤖 Starting AI analysis for file: file-xyz123
📡 Streaming response from DashScope...
✅ Analysis complete. Reason: stop
🏁 Stream ended
🗑️  Cleaned up file: /path/to/temp/paper_uuid.pdf
```

### Frontend Console
```bash
🚀 Starting AI interpretation for: Addition is All You Need...
📊 Status: downloading
📊 Status: uploading
📊 Status: analyzing
✅ Stream complete
```

## Cost Considerations

- **DashScope pricing:** Pay-per-token model
- **Average analysis:** ~$0.10 - $0.50 per paper
- **Rate limiting:** Prevents runaway costs
- **Caching recommended:** Avoid re-analyzing same papers

## Future Improvements

### Phase 1: Production Hardening (v0.2)
- [ ] Redis caching layer
- [ ] Prometheus metrics
- [ ] Structured logging (Winston)
- [ ] Analysis history storage

### Phase 2: Scalability (v0.3)
- [ ] Job queue (Bull/BullMQ)
- [ ] Concurrent request handling
- [ ] Webhook notifications
- [ ] Batch processing

### Phase 3: Features (v0.4)
- [ ] Multiple language support
- [ ] Custom analysis prompts
- [ ] Summary-only mode (faster/cheaper)
- [ ] Export to PDF/Markdown

## Troubleshooting

### Backend won't start
Check: `DASHSCOPE_API_KEY` in backend/.env

### Modal opens but nothing happens
Check: Browser console for errors, verify backend is running

### Analysis fails immediately
Check: Paper has valid arXiv PDF URL

### Stream cuts off mid-analysis
Check: Network stability, increase timeout if needed

### Rate limit errors
Check: Wait 1 hour before retrying, or contact admin to increase limit

## Support

- **DashScope docs:** https://help.aliyun.com/zh/dashscope/
- **Backend logs:** Check `backend/` terminal output
- **Frontend logs:** Open browser DevTools console
