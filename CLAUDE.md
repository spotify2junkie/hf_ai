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

1. **React Frontend** (`frontend/`) - Original TypeScript/React implementation
2. **Next.js Frontend** (`nextjs-frontend/`) - Modern Next.js 15 implementation with App Router
3. **Node.js Backend** (`backend/`) - Express API server with HuggingFace integration and AI interpretation

## Architecture

### Backend (Node.js/Express)
Entry point: `backend/src/server.js` (port 3001)

**Routes:**
- `/api/papers` - HuggingFace paper fetching
- `/api/ai-interpretation` - AI-powered paper analysis (uses Server-Sent Events)
- `/health` - Health check endpoint

**Services:**
- `services/huggingface.js` - Fetches papers from HuggingFace API, extracts metadata (title, authors, abstract, pdf_url, topics from ai_keywords)
- `services/dashscope.js` - Alibaba Cloud DashScope integration for AI paper interpretation (uses qwen-long model)
- `services/pdf-handler.js` - PDF download and temporary file management

**Key Implementation Details:**
- AI interpretation uses Server-Sent Events (SSE) for streaming responses
- DashScope service uploads PDF files and streams AI analysis back to client
- Papers are fetched with validation for date format (YYYY-MM-DD) and no future dates
- Topics are extracted from `paper.ai_keywords` field in HuggingFace API response

### Frontend Options

#### React Frontend (`frontend/`)
- TypeScript + React 18
- TailwindCSS for styling
- React Query for data fetching
- Date picker with react-datepicker
- Proxy configured to backend on port 3001

**Key Components:**
- `PapersTable.tsx` - Main table display
- `AIInterpretationModal.tsx` - Modal for AI analysis with SSE streaming
- `DatePicker.tsx` - Date selection
- `MarkdownRenderer.tsx` - Renders AI interpretation results

#### Next.js Frontend (`nextjs-frontend/`)
- Next.js 15 with App Router
- Server-side API routes (`app/api/`)
- Tailwind CSS v4
- TypeScript
- Built-in API caching and optimization

**Structure:**
- `app/` - Next.js App Router pages and layouts
- `components/ui/` - Reusable UI components
- `lib/api/` - API client functions
- `types/` - TypeScript type definitions

## Development Commands

### Backend
```bash
cd backend
npm install
npm run dev      # Start with nodemon (auto-reload)
npm start        # Production start
npm test         # Run tests
```

### React Frontend
```bash
cd frontend
npm install
npm start        # Start on port 3000
npm run build    # Production build
npm test         # Run tests
```

### Next.js Frontend
```bash
cd nextjs-frontend
npm install
npm run dev      # Start development server
npm run build    # Production build
npm start        # Production start
npm run lint     # Run ESLint
```

### Docker Compose
```bash
# Start all services
docker-compose up

# Rebuild and start
docker-compose up --build

# Services run on:
# - Backend: http://localhost:3001
# - Frontend: http://localhost:3000
```

## Environment Configuration

Required environment variables (see `.env.example`):

**Backend:**
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `HUGGINGFACE_API_URL` - HuggingFace API base URL
- `DASHSCOPE_API_KEY` - Alibaba Cloud DashScope API key (for AI interpretation)

**Frontend:**
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:3001)

## Key Data Flow

1. **Paper Fetching:**
   - User selects date in frontend
   - Frontend calls `/api/papers?date=YYYY-MM-DD`
   - Backend fetches from HuggingFace API
   - Response includes: title, authors, abstract, pdf_url, topics (from ai_keywords), paper_id, upvotes

2. **AI Interpretation:**
   - User clicks "AI Interpret" on a paper
   - Frontend opens SSE connection to `/api/ai-interpretation`
   - Backend downloads PDF, uploads to DashScope, streams analysis back
   - Frontend displays streaming markdown response in modal
   - Analysis follows structured prompt template in Chinese (core concepts, terminology, methodology, experiments, conclusions)

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

**DashScope API:**
- Base URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- File upload endpoint: `/files`
- Analysis endpoint: `/chat/completions` with streaming
- Model: `qwen-long`
- Analysis prompt is in Chinese and requests detailed paper explanation

## Common Patterns

**Error Handling:**
- Date validation in backend/src/routes/papers.js:11-42
- API error categorization (502 for external API, 503 for network)
- SSE error propagation in AI interpretation

**Streaming:**
- AI interpretation uses SSE for real-time updates
- Heartbeat messages every 30 seconds to keep connection alive
- Client disconnect cleanup in backend/src/routes/ai-interpretation.js:45-51

**File Management:**
- PDFs downloaded to temporary location
- Cleanup on completion or error
- Cleanup on client disconnect
