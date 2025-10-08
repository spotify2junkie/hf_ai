# Daily Paper Extractor

A full-stack web application for discovering and analyzing academic papers from HuggingFace's daily paper collection. Features AI-powered paper interpretation using Alibaba Cloud DashScope.

## ✨ Features

### Core Features
- 📅 **Date Picker** - Select any date to view papers from that day
- 📚 **Paper Discovery** - Fetch papers from HuggingFace API
- 📊 **Clean Interface** - Modern, responsive table display
- 🔗 **Rich Metadata** - View titles, abstracts, authors, topics, and PDF links
- 🤖 **AI Interpretation** - On-demand detailed paper analysis in Chinese

### AI Paper Analysis (v0.2+)
- 🧠 **Deep Learning Analysis** - Powered by Alibaba Cloud DashScope (Qwen-Long)
- 📝 **Comprehensive Breakdown** - Core concepts, methodology, experiments, conclusions
- ⚡ **Real-time Streaming** - Watch analysis generate live via Server-Sent Events
- 💾 **Smart Caching** - Stores analyses for 48 hours to reduce API costs
- 🔒 **Secure** - Rate-limited, input validated, arxiv.org PDFs only

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **React 18** with TypeScript for type safety
- **TailwindCSS** for modern styling
- **React Query** for efficient data fetching
- **Server-Sent Events** for real-time AI streaming
- **Markdown Rendering** with syntax highlighting

### Backend (Node.js + Express)
- **Express.js** REST API with SSE support
- **DashScope Integration** for AI paper interpretation
- **PDF Handler** with streaming downloads and validation
- **File-based Caching** for analysis results
- **Rate Limiting** (100/15min general, 10/hour AI)
- **Automatic Cleanup** for temp files and cache

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- DashScope API key (for AI features)

### 1. Clone and Install

```bash
# Clone repository
git clone <your-repo-url>
cd hf_ai

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Backend configuration
cd backend
cp .env.example .env

# Edit .env and add your DashScope API key
# Get one from: https://dashscope.aliyun.com/
DASHSCOPE_API_KEY=your_key_here
```

### 3. Start Services

```bash
# Terminal 1: Start backend (port 3001)
cd backend
npm run dev

# Terminal 2: Start frontend (port 3000)
cd frontend
npm run dev
```

### 4. Open Application

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage

### Viewing Papers
1. Select a date using the date picker
2. Click "Fetch Papers"
3. Browse papers in the table
4. Click PDF links to view full papers

### AI Interpretation
1. Click "AI Interpret" button on any paper
2. Watch as the system:
   - Downloads PDF from arXiv
   - Uploads to DashScope AI service
   - Streams detailed analysis in real-time
3. Analysis includes:
   - Core concepts and insights
   - Terminology explanations
   - Methodology breakdown
   - Experimental results
   - Contributions and limitations

## 🛡️ Security Features

- ✅ **URL Validation** - Only arxiv.org PDFs allowed
- ✅ **File Size Limits** - 100MB maximum enforced during download
- ✅ **Input Sanitization** - All user inputs escaped
- ✅ **Rate Limiting** - Prevents abuse and runaway costs
- ✅ **CORS Protection** - Restricted origins in production
- ✅ **API Key Protection** - Environment variables only, never logged
- ✅ **Automatic Cleanup** - Temp files deleted after processing

## 📊 Project Structure

```
hf_ai/
├── backend/                # Node.js Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── papers.js           # Paper fetching endpoint
│   │   │   └── ai-interpretation.js # AI analysis endpoint (SSE)
│   │   ├── services/
│   │   │   ├── huggingface.js      # HuggingFace API client
│   │   │   ├── dashscope.js        # DashScope AI integration
│   │   │   ├── pdf-handler.js      # PDF download/cleanup
│   │   │   └── cache.js            # File-based cache service
│   │   └── server.js               # Express app setup
│   ├── .env.example
│   └── package.json
│
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── PapersTable.tsx          # Main table display
│   │   │   ├── AIInterpretationModal.tsx # AI analysis modal
│   │   │   ├── DatePicker.tsx           # Date selection
│   │   │   └── MarkdownRenderer.tsx     # Markdown display
│   │   ├── services/
│   │   │   └── api.ts                   # API client
│   │   ├── types/index.ts               # TypeScript types
│   │   └── App.tsx                      # Main app component
│   ├── .env.example
│   └── package.json
│
├── docs/
│   └── AI_INTERPRETATION.md  # Detailed AI feature docs
├── CLAUDE.md                 # Claude Code workflow instructions
└── README.md                 # This file
```

## 🔧 API Endpoints

### Papers API
```
GET /api/papers?date=YYYY-MM-DD
```
Returns papers for the specified date from HuggingFace.

### AI Interpretation (SSE)
```
POST /api/ai-interpretation
Content-Type: application/json

{
  "pdf_url": "https://arxiv.org/pdf/2410.00907.pdf",
  "paper_id": "2410.00907",
  "paper_title": "Paper Title"
}
```
Streams AI analysis via Server-Sent Events.

### Health Checks
```
GET /health                          # Backend health
GET /api/ai-interpretation/health    # AI service health
```

## 📈 Performance Features

- **Lazy Loading** - AI analysis only runs on-demand
- **Caching** - Analysis results cached for 48 hours
- **Streaming** - Real-time updates via SSE (no polling)
- **Automatic Cleanup** - Hourly cleanup of temp files and old cache
- **Connection Keep-Alive** - 30-second heartbeats prevent timeouts

## 🐛 Troubleshooting

### Backend won't start
**Issue:** `DASHSCOPE_API_KEY environment variable is required`
**Solution:** Add your API key to `backend/.env`

### Frontend can't connect to backend
**Issue:** Network error messages
**Solution:** Ensure backend is running on port 3001

### AI interpretation fails
**Issue:** "Failed to download PDF"
**Solution:** Verify paper has valid arXiv PDF URL

### Rate limit errors
**Issue:** "Too many requests"
**Solution:** Wait 1 hour before retrying (10 AI requests/hour limit)

## 🔜 Roadmap

### v0.3 - Scalability
- [ ] Redis caching for distributed systems
- [ ] Job queue (Bull/BullMQ) for concurrent requests
- [ ] Prometheus metrics and monitoring
- [ ] Structured logging (Winston)

### v0.4 - Enhanced Features
- [ ] Multi-language support for analysis
- [ ] Custom analysis prompts
- [ ] Summary-only mode (faster/cheaper)
- [ ] Analysis history and bookmarks
- [ ] Export analyses to PDF/Markdown

## 📝 Documentation

- **[AI Interpretation Guide](docs/AI_INTERPRETATION.md)** - Complete AI feature documentation
- **[Setup Guide](SETUP.md)** - Detailed installation instructions
- **[Claude Code Workflow](CLAUDE.md)** - Development workflow guidelines

## 🏷️ Version Tags

- **v0.1** - Frontend/backend tested, basic features
- **v0.2** - AI interpretation with caching and cleanup (current)

## 📄 License

MIT License

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make your changes and commit: `git commit -m 'feat: add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

## 💬 Support

For issues or questions:
- Check [AI_INTERPRETATION.md](docs/AI_INTERPRETATION.md) for AI feature help
- Review backend logs for error details
- Check browser console for frontend errors

---

Built with ❤️ using React, Node.js, and Alibaba Cloud DashScope
