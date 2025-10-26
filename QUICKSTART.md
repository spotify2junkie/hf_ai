# Quick Start - Deploy in 30 Minutes

Follow these steps to deploy your full-stack application.

## 📋 Prerequisites

- [ ] GitHub account
- [ ] Railway account (sign up at https://railway.app)
- [ ] Vercel account (already have: hf-ai-sigma.vercel.app)
- [ ] DASHSCOPE_API_KEY from Alibaba Cloud

---

## 🚀 Step 1: Deploy Backend to Railway (15 min)

### 1.1 Create New Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize GitHub and select: `spotify2junkie/hf_ai`
5. Railway will show "Configure" screen

### 1.2 Configure Service

1. Click **"Add Service"**
2. Select **"GitHub Repo"**
3. Choose root directory (Railway will detect `backend/railway.toml`)
4. Click **"Add variables"**

### 1.3 Add Environment Variables

Click **"Variables"** and add these:

```
NODE_ENV=production
PORT=3001
DASHSCOPE_API_KEY=your-key-from-dashscope
HUGGINGFACE_API_URL=https://huggingface.co/api/daily_papers
FRONTEND_URL=https://hf-ai-sigma.vercel.app
```

**Get DASHSCOPE_API_KEY:**
- Visit: https://dashscope.aliyun.com/
- Sign in and go to API Keys
- Create new key (starts with `sk-`)

### 1.4 Add PostgreSQL (Optional)

If you need database:
1. Click **"New"** → **"Database"** → **"Add PostgreSQL"**
2. `DATABASE_URL` and `DIRECT_URL` auto-added

### 1.5 Deploy & Get URL

1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Click your service name to see URL
4. **Copy the URL** - example: `https://hf-ai-backend.up.railway.app`

### 1.6 Test Backend

```bash
curl https://YOUR-RAILWAY-URL.railway.app/health
```

Should return:
```json
{"status":"OK","timestamp":"2025-10-26T..."}
```

✅ **Save your Railway URL - you need it for Step 2!**

---

## 🌐 Step 2: Configure Vercel (10 min)

### 2.1 Set Environment Variables

1. Go to https://vercel.com/dashboard
2. Select project: **hf-ai-sigma**
3. Go to **Settings** → **Environment Variables**
4. Add these variables for **Production**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-RAILWAY-URL.railway.app` |
| `BACKEND_INTERNAL_URL` | `https://YOUR-RAILWAY-URL.railway.app` |
| `CRON_SECRET` | Generate: `openssl rand -base64 32` |
| `NODE_ENV` | `production` |

### 2.2 Generate CRON_SECRET

On your Mac terminal:
```bash
openssl rand -base64 32
```

Copy the output and paste as `CRON_SECRET` value in Vercel.

### 2.3 Save Variables

Click **"Save"** for each variable.

---

## 🔄 Step 3: Deploy to Vercel (5 min)

### 3.1 Merge Changes

On your local machine:

```bash
cd /Users/yh/Desktop/hf_ai

# Merge to main
git checkout main
git merge claude-session-20251026-fullstack-deployment
git push origin main
```

### 3.2 Wait for Deployment

1. Go to https://vercel.com/dashboard
2. Watch deployment progress (~2-3 minutes)
3. When complete, visit: https://hf-ai-sigma.vercel.app

### 3.3 Verify Frontend

You should see:
- ✅ Next.js frontend (NOT backend code!)
- ✅ Date picker
- ✅ Papers table
- ✅ Search bar

---

## ✅ Step 4: Test Everything

### Test Papers Fetching

1. Visit https://hf-ai-sigma.vercel.app
2. Select today's date
3. Click **"Fetch Papers"**
4. Papers should load

### Test Health Endpoints

**Frontend:**
```bash
curl https://hf-ai-sigma.vercel.app/api/health
```

**Backend:**
```bash
curl https://YOUR-RAILWAY-URL.railway.app/health
```

Both should return `{"status":"OK",...}`

### Test Cron Job (Optional)

```bash
curl -X GET https://hf-ai-sigma.vercel.app/api/cron/prefetch \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 📊 Verification Checklist

- [ ] Backend deployed on Railway
- [ ] Backend health check returns OK
- [ ] Frontend shows Next.js app (not backend code)
- [ ] Papers load for selected date
- [ ] Search filters papers
- [ ] No CORS errors in browser console (F12 → Console)
- [ ] Vercel environment variables set
- [ ] Cron job configured in Vercel

---

## 🎉 Success!

Your app is now fully deployed:

- **Frontend**: https://hf-ai-sigma.vercel.app
- **Backend**: https://YOUR-RAILWAY-URL.railway.app
- **Cron**: Runs daily at midnight UTC

---

## 🐛 Troubleshooting

### Frontend still shows backend code

**Problem**: Vercel didn't rebuild with new config

**Solution**:
1. Go to Vercel dashboard → Deployments
2. Click "..." on latest deployment
3. Click "Redeploy"

### CORS errors in browser

**Problem**: Backend doesn't allow frontend URL

**Solution**: Add to Railway backend variables:
```
FRONTEND_URL=https://hf-ai-sigma.vercel.app
```

### Papers don't load

**Debug**:
1. Open browser console (F12)
2. Check for error messages
3. Verify `NEXT_PUBLIC_API_URL` in Vercel settings
4. Test backend directly: `curl https://YOUR-RAILWAY-URL.railway.app/api/papers?date=2025-10-26`

### Need help?

See full guide: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🔧 Local Development

To run locally:

```bash
# Terminal 1 - Backend
cd /Users/yh/Desktop/hf_ai
npm run dev:backend

# Terminal 2 - Frontend
cd /Users/yh/Desktop/hf_ai
npm run dev:nextjs
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

Don't forget to create `.env.local` in `nextjs-frontend/`:
```bash
cd nextjs-frontend
cp .env.example .env.local
# Edit .env.local with local URLs
```

---

**Next**: Want to add AI interpretation feature? See DEPLOYMENT.md Phase 2!
