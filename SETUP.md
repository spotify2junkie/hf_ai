# Setup Guide

This guide will help you set up the Daily Paper Extractor application locally.

## Prerequisites

- Node.js >= 18.0.0
- npm (comes with Node.js)
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hf_ai
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file and add your DashScope API key:

```bash
# REQUIRED: Get your API key from https://dashscope.console.aliyun.com/
DASHSCOPE_API_KEY=your_actual_api_key_here
```

**Important:** The application will not start without a valid `DASHSCOPE_API_KEY`.

### 3. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend (React)
```bash
cd ../frontend
npm install
```

#### Frontend (Next.js) - Optional
```bash
cd ../nextjs-frontend
npm install
```

### 4. Start the Application

You'll need to run both the backend and frontend in separate terminals.

#### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

The backend will start on http://localhost:3001

#### Terminal 2 - Frontend (React)
```bash
cd frontend
npm start
```

The frontend will start on http://localhost:3000

**OR** use the Next.js frontend:

```bash
cd nextjs-frontend
npm run dev
```

The Next.js frontend will start on http://localhost:3000

### 5. Verify Setup

1. Open http://localhost:3000 in your browser
2. Select a date (not in the future)
3. Click to fetch papers
4. You should see papers from HuggingFace displayed

## Using Docker Compose (Alternative)

If you prefer to use Docker:

```bash
docker-compose up
```

This will start both backend and frontend services:
- Backend: http://localhost:3001
- Frontend: http://localhost:3000

## Development

### Backend Development

The backend uses nodemon for auto-reload during development:

```bash
cd backend
npm run dev
```

### Frontend Development

React frontend has hot-reload enabled by default:

```bash
cd frontend
npm start
```

### API Testing

Test the backend API directly:

```bash
# Health check
curl http://localhost:3001/health

# Fetch papers
curl "http://localhost:3001/api/papers?date=2024-01-15"

# Check AI interpretation service
curl http://localhost:3001/api/ai-interpretation/health
```

## Security Features

This application includes several security features:

1. **Rate Limiting**
   - General API: 100 requests per 15 minutes per IP
   - AI Interpretation: 10 requests per hour per IP

2. **CORS Protection**
   - Only allows requests from localhost:3000, localhost:3002, and configured frontend URLs
   - Blocks all other origins

3. **Input Validation**
   - All URLs must be from arxiv.org
   - Date format validation (YYYY-MM-DD)
   - Input sanitization to prevent injection

4. **Error Handling**
   - React Error Boundary prevents app crashes
   - Graceful error messages to users
   - Detailed errors in development mode only

## Troubleshooting

### Backend Won't Start

**Error:** `DASHSCOPE_API_KEY environment variable is required`

**Solution:** Make sure you've created a `.env` file with a valid `DASHSCOPE_API_KEY`.

### CORS Errors

**Error:** `Not allowed by CORS`

**Solution:** Make sure your frontend is running on localhost:3000 or localhost:3002. For production, set the `FRONTEND_URL` environment variable.

### Rate Limited

**Error:** `Too many requests from this IP`

**Solution:** Wait for the rate limit window to reset (15 minutes for general API, 1 hour for AI interpretation).

### PDF Download Fails

**Error:** `Only arxiv.org PDFs are allowed`

**Solution:** This is a security feature. Only PDFs from arxiv.org are supported. Make sure the PDF URL is from arxiv.org.

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Backend server port |
| `NODE_ENV` | No | development | Environment (development/production) |
| `DASHSCOPE_API_KEY` | **Yes** | None | Alibaba Cloud DashScope API key |
| `HUGGINGFACE_API_URL` | No | https://huggingface.co/api | HuggingFace API base URL |
| `REACT_APP_API_URL` | No | http://localhost:3001 | Backend API URL for React app |
| `NEXT_PUBLIC_API_URL` | No | http://localhost:3001 | Backend API URL for Next.js app |
| `FRONTEND_URL` | No | None | Production frontend URL for CORS |
| `DEBUG` | No | false | Enable debug logging |

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Set `FRONTEND_URL` to your production frontend URL
3. Use `npm start` instead of `npm run dev` for backend
4. Build frontend: `npm run build` in frontend directory
5. Serve built files with a static file server (nginx, Apache, etc.)

## Support

For issues and questions:
- Check the [README.md](README.md) for project overview
- Check the [CLAUDE.md](CLAUDE.md) for development guidelines
- Review the [design_doc.md](design_doc.md) for architecture details
