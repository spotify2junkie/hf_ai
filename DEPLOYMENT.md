# Deployment Guide - Full-Stack Next.js + Express

This guide walks you through deploying the HF AI Daily Papers application with:
- **Frontend**: Next.js on Vercel
- **Backend**: Express API on Railway

## Architecture Overview

```
┌─────────────────────────────────┐
│    Vercel (Frontend)            │
│  https://hf-ai-sigma.vercel.app │
│                                 │
│  - Next.js App                  │
│  - Static pages                 │
│  - API routes (proxy)           │
│  - Cron job trigger             │
└────────────┬────────────────────┘
             │ HTTPS
             ↓
┌─────────────────────────────────┐
│  Railway (Backend)              │
│  https://hf-ai-backend.up.app   │
│                                 │
│  - Express API                  │
│  - PostgreSQL Database          │
│  - SSE for AI interpretation    │
│  - Long-running connections OK  │
└────────────┬────────────────────┘
             │
             ↓
    External APIs (HuggingFace, DashScope)
```

---

## Phase 1: Deploy Backend to Railway (30 minutes)

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Connect your GitHub account and select `spotify2junkie/hf_ai`

### Step 2: Configure Backend Service

1. Railway will detect the monorepo structure
2. Click "Add Service" → "GitHub Repo"
3. Select the `backend` directory as the root
4. Railway will automatically detect `railway.toml` configuration

### Step 3: Add PostgreSQL Database (if needed)

1. Click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically provide `DATABASE_URL` and `DIRECT_URL`
3. These are automatically injected into your backend service

### Step 4: Set Environment Variables

Go to your backend service → "Variables" tab and add:

```bash
# Required Variables
NODE_ENV=production
PORT=3001

# Database (auto-provided by Railway if you added PostgreSQL)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# API Keys
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxx
HUGGINGFACE_API_URL=https://huggingface.co/api/daily_papers

# CORS Configuration
FRONTEND_URL=https://hf-ai-sigma.vercel.app
```

**To get DASHSCOPE_API_KEY:**
1. Go to https://dashscope.aliyun.com/
2. Sign up and create an API key
3. Copy the key starting with `sk-`

### Step 5: Deploy Backend

1. Railway will automatically deploy after you set variables
2. Wait for build to complete (~2-3 minutes)
3. Click on your service to see the deployment URL (e.g., `https://hf-ai-backend.up.railway.app`)
4. Test health endpoint: `curl https://your-backend-url.railway.app/health`

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-26T..."
}
```

### Step 6: Copy Backend URL

**IMPORTANT**: Copy your Railway backend URL. You'll need it for Vercel configuration.

Example: `https://hf-ai-backend.up.railway.app`

---

## Phase 2: Configure Vercel Frontend (15 minutes)

### Step 1: Set Environment Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Select your project: `hf-ai-sigma`
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

#### Production Environment:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.railway.app` | Production |
| `BACKEND_INTERNAL_URL` | `https://your-backend.railway.app` | Production |
| `CRON_SECRET` | Generate with: `openssl rand -base64 32` | Production |
| `NODE_ENV` | `production` | Production |

#### Preview Environment (Optional):

Same as production or point to a staging backend.

#### Development Environment:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Development |
| `BACKEND_INTERNAL_URL` | `http://localhost:3001` | Development |

### Step 2: Generate CRON_SECRET

On your local machine:
```bash
openssl rand -base64 32
```

Copy the output and add it to Vercel environment variables.

### Step 3: Create Local Environment File

For local development:

```bash
cd /Users/yh/Desktop/hf_ai/nextjs-frontend
cp .env.example .env.local
```

Edit `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
BACKEND_INTERNAL_URL=http://localhost:3001
CRON_SECRET=your-local-secret
```

---

## Phase 3: Deploy to Vercel (5 minutes)

### Option A: Deploy from Git (Recommended)

1. Commit and push all changes:
```bash
git add -A
git commit -m "feat: configure full-stack deployment with Railway + Vercel"
git push origin claude-session-20251026-fullstack-deployment
```

2. Merge to main:
```bash
git checkout main
git merge claude-session-20251026-fullstack-deployment
git push origin main
```

3. Vercel will automatically deploy the main branch

### Option B: Manual Deploy with Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
cd /Users/yh/Desktop/hf_ai
vercel --prod
```

### Step 4: Verify Deployment

1. Go to https://hf-ai-sigma.vercel.app
2. You should see the Next.js frontend (not the backend code!)
3. Select a date and click "Fetch Papers"
4. Papers should load successfully

---

## Phase 4: Configure Vercel Cron (5 minutes)

### Step 1: Set Cron Secret Header

In Vercel dashboard:

1. Go to **Settings** → **Environment Variables**
2. Ensure `CRON_SECRET` is set (from Phase 2)
3. Go to **Cron Jobs** tab
4. Your cron job should be listed: `0 0 * * *` → `/api/cron/prefetch`

### Step 2: Test Cron Manually

```bash
curl -X GET https://hf-ai-sigma.vercel.app/api/cron/prefetch \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2025-10-26T...",
  "backend_response": { ... }
}
```

---

## Verification Checklist

After deployment, verify all features work:

- [ ] **Frontend loads** at https://hf-ai-sigma.vercel.app
- [ ] **Papers fetch** for today's date
- [ ] **Date picker** works (no future dates allowed)
- [ ] **Search** filters papers by keyword
- [ ] **Health check** returns OK: https://hf-ai-sigma.vercel.app/api/health
- [ ] **Backend health** returns OK: https://your-backend.railway.app/health
- [ ] **No CORS errors** in browser console
- [ ] **AI interpretation** button appears (if implemented)
- [ ] **Cron job** runs daily at midnight UTC

---

## Local Development Setup

### Step 1: Install Dependencies

```bash
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install
npx prisma generate
cd ..

# Frontend dependencies
cd nextjs-frontend
npm install
cd ..
```

### Step 2: Set Environment Variables

**Backend** (`backend/.env`):
```bash
PORT=3001
NODE_ENV=development
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxx
HUGGINGFACE_API_URL=https://huggingface.co/api/daily_papers
DATABASE_URL=postgresql://localhost:5432/hf_ai
DIRECT_URL=postgresql://localhost:5432/hf_ai
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`nextjs-frontend/.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
BACKEND_INTERNAL_URL=http://localhost:3001
CRON_SECRET=dev-secret
```

### Step 3: Start Development Servers

**Option 1: Both servers together**
```bash
npm run dev
```

**Option 2: Separate terminals**

Terminal 1 (Backend):
```bash
npm run dev:backend
```

Terminal 2 (Frontend):
```bash
npm run dev:nextjs
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Backend Health: http://localhost:3001/health

---

## Troubleshooting

### Issue: Frontend shows backend code

**Cause**: `vercel.json` still routes to backend

**Solution**: Verify `vercel.json` has:
```json
{
  "framework": "nextjs",
  "buildCommand": "cd nextjs-frontend && npm install && npm run build",
  "outputDirectory": "nextjs-frontend/.next"
}
```

### Issue: CORS errors in browser

**Cause**: Backend not configured for frontend URL

**Solution**: Add to Railway backend environment variables:
```bash
FRONTEND_URL=https://hf-ai-sigma.vercel.app
```

### Issue: AI interpretation times out

**Cause**: This is expected if backend is on Vercel Serverless (10s limit)

**Solution**: Backend must be on Railway/Render for SSE support

### Issue: Cron job fails with 401

**Cause**: `CRON_SECRET` mismatch

**Solution**: Ensure same secret in:
1. Vercel environment variables: `CRON_SECRET`
2. Vercel cron request header: `Authorization: Bearer YOUR_CRON_SECRET`

### Issue: Papers not loading

**Debug steps:**
1. Check browser console for errors
2. Verify `NEXT_PUBLIC_API_URL` in Vercel environment variables
3. Test backend directly: `curl https://your-backend.railway.app/api/papers?date=2025-10-26`
4. Check Railway logs for backend errors

### Issue: Database connection errors

**Cause**: Prisma client not generated or connection string invalid

**Solution**:
```bash
cd backend
npx prisma generate
npx prisma migrate deploy  # If you have migrations
```

---

## Cost Estimates

### Free Tier Limits

**Vercel (Frontend)**:
- 100 GB bandwidth/month
- Unlimited deployments
- Hobby plan: $0/month

**Railway (Backend)**:
- $5 free credits/month
- ~550 hours runtime
- ~100GB bandwidth
- Starter plan: $5/month after credits

**Total**: Free tier sufficient for moderate usage (~1000 users/month)

---

## Production Optimizations

### 1. Enable Vercel Analytics

In `nextjs-frontend/src/app/layout.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. Add Redis Caching (Optional)

For high-traffic scenarios, add Redis to Railway:
1. Railway Dashboard → "New" → "Database" → "Redis"
2. Add `REDIS_URL` to backend environment variables
3. Update backend cache service to use Redis

### 3. Configure CDN Caching

Papers data changes daily, so enable edge caching:

In `nextjs-frontend/src/app/api/papers/route.ts`:
```typescript
export const revalidate = 3600; // Cache for 1 hour
```

### 4. Database Connection Pooling

Backend already uses Prisma connection pooling (5 connections).

For higher load, consider:
- PgBouncer on Railway
- Increase `connection_limit` in Prisma schema

---

## Monitoring & Logging

### Vercel Logs

View logs:
```bash
vercel logs https://hf-ai-sigma.vercel.app
```

Or in dashboard: Project → Logs

### Railway Logs

Railway Dashboard → Select Service → "Logs" tab

Real-time logs:
```bash
railway logs --service backend
```

### Health Checks

Set up monitoring with:
- **UptimeRobot** (free): https://uptimerobot.com
- **Better Uptime**: https://betteruptime.com

Monitor URLs:
- `https://hf-ai-sigma.vercel.app/api/health`
- `https://your-backend.railway.app/health`

---

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` only
2. **Rotate API keys** regularly (DASHSCOPE_API_KEY)
3. **Use CRON_SECRET** to protect cron endpoints
4. **Enable rate limiting** (already configured in backend)
5. **Monitor Railway costs** to avoid unexpected charges
6. **Use environment variables** for all secrets

---

## Support & Resources

**Documentation:**
- Next.js: https://nextjs.org/docs
- Railway: https://docs.railway.app
- Vercel: https://vercel.com/docs
- Prisma: https://www.prisma.io/docs

**Project Repository:**
- GitHub: https://github.com/spotify2junkie/hf_ai

**Issues & Questions:**
- Open an issue on GitHub
- Check CLAUDE.md for development guidelines

---

## Next Steps

After successful deployment:

1. **Add AI Interpretation Feature** (Phase 2)
   - Implement `AIInterpretationModal.tsx`
   - Add SSE client handling
   - Update `PaperCard.tsx` with AI button

2. **Implement User Authentication** (Optional)
   - NextAuth.js for authentication
   - Protect admin endpoints
   - User preferences and favorites

3. **Add Analytics Dashboard** (Optional)
   - Track popular papers
   - User engagement metrics
   - API usage statistics

4. **Set Up CI/CD**
   - GitHub Actions for testing
   - Automated Prisma migrations
   - Preview deployments for PRs

---

**Deployment Date**: October 26, 2025
**Last Updated**: October 26, 2025
**Version**: 1.0.0
