# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Workflow

**IMPORTANT: At the VERY START of any coding task, you MUST:**
1. Create a new branch using the format: `claude-session-YYYYMMDD-[topic]`
2. Push the branch to origin
3. Start committing changes immediately

### Starting a Session
When user requests any code changes:
```bash
# Create feature branch
git checkout -b claude-session-YYYYMMDD-[topic]
git push -u origin claude-session-YYYYMMDD-[topic]
```

### During Session
1. **Commit after EVERY change** without asking permission:
   ```bash
   git add -A && git commit -m "[action]: [description]"
   ```

2. **Push regularly** (every 3-5 commits):
   ```bash
   git push origin HEAD
   ```

### Commit Message Format
Use these prefixes:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `style`: Formatting/styling changes
- `docs`: Documentation updates
- `chore`: Maintenance tasks
- `test`: Test-related changes

Example: `git commit -m "feat: add user authentication"`

## Working Process

### 1. Understand First
- Read existing code and documentation
- Understand project structure before making changes
- Ask clarifying questions if needed

### 2. Make Changes Incrementally
- Write code in logical chunks
- Commit after each meaningful change
- Keep commits atomic and focused

### 3. Communication
- Explain what you're doing and why
- Point out potential issues or considerations
- Suggest next steps after each change

## Project Overview

Daily Paper Extractor is a full-stack web application for fetching and analyzing academic papers from the HuggingFace daily papers API. The system includes:

1. **Next.js Frontend** (`nextjs-frontend/`) - Modern Next.js 15 implementation with App Router (deployed on Vercel)
2. **Node.js Backend** (`backend/`) - Express API server with HuggingFace integration and AI interpretation (deployed on Railway)

## Architecture

### Backend (Node.js/Express)
Entry point: `backend/src/server.js` (port 3001)

**Routes:**
- `/api/papers` - HuggingFace paper fetching
- `/api/ai-interpretation` - AI-powered paper analysis (uses Server-Sent Events)
- `/health` - Health check endpoint

**Services:**
- `services/huggingface.js` - Fetches papers from HuggingFace API, extracts metadata (title, authors, abstract, pdf_url, topics from ai_keywords)
- `services/dashscope.js` - Alibaba Cloud DashScope integration for abstract translation (uses qwen-plus model)
- `services/siliconflow.js` - SiliconFlow API integration for full paper explanation (uses Qwen/Qwen2.5-7B-Instruct model)
- `services/pdf-handler.js` - PDF download and temporary file management

**Key Implementation Details:**
- **Dual AI Service Architecture**:
  - DashScope (Alibaba Qwen) handles abstract translation
  - SiliconFlow handles full paper PDF explanation with base64 encoding
- AI interpretation uses Server-Sent Events (SSE) for streaming responses
- SiliconFlow service converts PDFs to base64 data URLs for API submission
- Papers are fetched with validation for date format (YYYY-MM-DD) and no future dates
- Topics are extracted from `paper.ai_keywords` field in HuggingFace API response

### Frontend (Next.js)

**Next.js Frontend** (`nextjs-frontend/`)
- Next.js 15 with App Router
- React 19 with Server Components
- Tailwind CSS v4
- TypeScript
- Framer Motion for animations
- Built-in API caching and optimization

**Structure:**
- `app/` - Next.js App Router pages and layouts
- `components/ui/` - Reusable UI components (PaperCard, DatePicker, LoadingSkeleton, Modal)
- `components/` - Feature components (AIExplanationModal)
- `lib/api/` - API client functions with retry logic
- `types/` - TypeScript type definitions

**Key Features:**
- Responsive grid layout (1-4 columns based on screen size)
- Collapsible Chinese abstract translations
- **AI Explanation Modal** - Full paper analysis with streaming responses
- "AI解读" button on each paper card for deep explanations
- Colorful topic tags with consistent hashing
- Client-side caching with localStorage
- Error boundaries for graceful error handling

## Development Commands

### Backend
```bash
cd backend
npm install
npm run dev      # Start with nodemon (auto-reload)
npm start        # Production start
npm test         # Run tests
```

### Next.js Frontend
```bash
cd nextjs-frontend
npm install
npm run dev      # Start development server (port 3002)
npm run build    # Production build
npm start        # Production start
npm run lint     # Run ESLint
```

### Full Stack Development
```bash
# From project root - runs both backend and frontend concurrently
npm run dev

# Services run on:
# - Backend: http://localhost:3001
# - Next.js Frontend: http://localhost:3002
```

### Docker Compose
```bash
# Start all services
docker-compose up

# Rebuild and start
docker-compose up --build

# Services run on:
# - Backend: http://localhost:3001
# - Next.js Frontend: http://localhost:3002
```

## Environment Configuration

Required environment variables (see `.env.example`):

**Backend:**
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `HUGGINGFACE_API_URL` - HuggingFace API base URL
- `DASHSCOPE_API_KEY` - Alibaba Cloud DashScope API key (for abstract translation)
- `SILICONFLOW_API_KEY` - SiliconFlow API key (for full paper explanation)
- `SILICONFLOW_MODEL` - SiliconFlow model name (default: Qwen/Qwen2.5-7B-Instruct)

**Frontend (Next.js):**
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3001)

## Key Data Flow

1. **Paper Fetching:**
   - User selects date in frontend
   - Frontend calls `/api/papers?date=YYYY-MM-DD`
   - Backend fetches from HuggingFace API
   - Response includes: title, authors, abstract, pdf_url, topics (from ai_keywords), paper_id, upvotes

2. **Abstract Translation (DashScope):**
   - Automatic when papers are fetched without Chinese abstract
   - Uses DashScope qwen-plus model for translation
   - Translations cached in database and file system
   - Displayed in collapsible section on paper cards

3. **Full Paper Explanation (SiliconFlow):**
   - User clicks "AI解读" button on a paper card
   - Frontend opens modal and starts POST request to `/api/ai-interpretation`
   - Backend downloads PDF, converts to base64 data URL
   - Backend streams analysis from SiliconFlow API using SSE
   - Frontend displays streaming markdown response in modal
   - Analysis follows detailed structured prompt template in Chinese:
     - 论文核心概念 (core concepts)
     - 论文内名词解释 (terminology)
     - 论文方法 (methodology with past problems, framework, and challenges)
     - 实验结果与分析 (experiments and analysis)
     - 结论 (contributions, limitations, future directions)

## Testing Strategy

- Backend tests use Jest
- Frontend tests use React Testing Library
- API endpoints have `/health` routes for monitoring
- Date validation prevents future dates and validates YYYY-MM-DD format

## API Integration Notes

**HuggingFace API:**
- Endpoint: `https://huggingface.co/api/daily_papers?date=YYYY-MM-DD`
- Returns array of papers with nested `paper` objects
- Topics extracted from `paper.ai_keywords` field
- PDF URLs constructed as `https://arxiv.org/pdf/{paper_id}.pdf`

**DashScope API (Abstract Translation):**
- Base URL: `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`
- Model: `qwen-plus`
- Used for translating English abstracts to Chinese
- Non-streaming synchronous requests

**SiliconFlow API (Paper Explanation):**
- Base URL: `https://api.siliconflow.cn/v1`
- Endpoint: `/chat/completions` with streaming
- Model: `Qwen/Qwen2.5-7B-Instruct` (configurable)
- Accepts PDF as base64 data URL in image_url content type
- Uses detailed Chinese analysis prompt with structured sections
- Streaming SSE response for real-time content delivery

## Security Best Practices

**CRITICAL - Environment Variables:**
- `DASHSCOPE_API_KEY` is **REQUIRED** - used for abstract translation
- `SILICONFLOW_API_KEY` is **REQUIRED** - used for full paper explanation
- Application will throw error if these keys are not set
- Never commit `.env` files or hardcode API keys in source code
- Use `.env.example` as template and create local `.env` file

**Rate Limiting:**
- General API: 100 requests per 15 minutes per IP
- AI Interpretation: 10 requests per hour per IP (resource intensive)
- Rate limit headers returned in response (RateLimit-*)

**CORS Security:**
- Only allows requests from: localhost:3000, localhost:3002, and FRONTEND_URL env variable
- All other origins are blocked with detailed logging
- For production, set FRONTEND_URL in environment

**Input Validation:**
- All PDF URLs validated and must be from arxiv.org only
- URL format validation using validator library
- Input sanitization to prevent injection attacks
- Paper titles and IDs are escaped before logging

**Error Boundaries:**
- React app wrapped in ErrorBoundary component (frontend/src/components/ErrorBoundary.tsx)
- Prevents full app crash on component errors
- Shows user-friendly error UI with retry options
- Error details shown in development mode only

## Common Patterns

**Error Handling:**
- Date validation in backend/src/routes/papers.js:11-42
- API error categorization (502 for external API, 503 for network)
- SSE error propagation in AI interpretation
- React ErrorBoundary catches component errors

**Streaming:**
- AI interpretation uses SSE for real-time updates
- Heartbeat messages every 30 seconds to keep connection alive
- Client disconnect cleanup in backend/src/routes/ai-interpretation.js:45-51
- PDF downloads use streaming to file (not buffered in memory)

**File Management:**
- PDFs downloaded to temporary location using streams
- Cleanup on completion or error
- Cleanup on client disconnect
- Automatic cleanup of files older than 1 hour
