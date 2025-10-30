# Vercel 部署指南

本文档说明如何将 Next.js 前端部署到 Vercel。

## 部署信息

- **前端框架**: Next.js 15
- **部署平台**: Vercel
- **后端服务**: Railway (https://hfai-production.up.railway.app)
- **项目目录**: `nextjs-frontend/`

---

## 步骤 1: Vercel 项目配置

### 1.1 设置 Root Directory

在 Vercel Dashboard 中：

1. 进入项目设置：Settings → General
2. 找到 "Root Directory" 设置
3. 设置为：`nextjs-frontend`
4. 点击 "Save"

**为什么需要这样做**：
- 项目是 monorepo 结构，包含多个子目录
- Vercel 需要知道从哪个目录构建 Next.js 应用

---

## 步骤 2: 配置环境变量

### 2.1 进入环境变量设置

1. 进入 Vercel Dashboard
2. 选择项目 `hf-ai`
3. 进入 Settings → Environment Variables

### 2.2 添加必需的环境变量

添加以下环境变量（应用到 Production, Preview, Development 三个环境）：

#### NEXT_PUBLIC_API_URL
```
NEXT_PUBLIC_API_URL=https://hfai-production.up.railway.app
```
- **说明**: 前端调用后端 API 的公共 URL
- **用途**: 客户端浏览器请求 API 时使用
- **前缀 NEXT_PUBLIC_**: 表示这个变量会暴露给浏览器

#### BACKEND_INTERNAL_URL
```
BACKEND_INTERNAL_URL=https://hfai-production.up.railway.app
```
- **说明**: 服务端调用后端 API 的内部 URL
- **用途**: Next.js API Routes 和 Server Components 使用
- **优点**: 如果有内部网络，可以配置更快的内部地址

#### CRON_SECRET
```
CRON_SECRET=eKOQELrM0Sv/YZLGqg2TIzFlKc5BEcKBwxvD/p4rVh8=
```
- **说明**: Vercel Cron Job 的认证密钥
- **用途**: 保护 `/api/cron/prefetch` 端点，防止未授权访问
- **生成方式**: `openssl rand -base64 32`
- **重要**: 这是一个敏感密钥，不要提交到代码仓库

#### NEXT_PUBLIC_ENABLE_AI_INTERPRETATION（可选）
```
NEXT_PUBLIC_ENABLE_AI_INTERPRETATION=true
```
- **说明**: 是否启用 AI 论文解读功能
- **用途**: 功能开关，可以在不修改代码的情况下启用/禁用功能
- **默认值**: true

### 2.3 环境变量配置截图示例

配置完成后应该看到：

| Name | Value | Environment |
|------|-------|-------------|
| NEXT_PUBLIC_API_URL | https://hfai-production.up.railway.app | Production, Preview, Development |
| BACKEND_INTERNAL_URL | https://hfai-production.up.railway.app | Production, Preview, Development |
| CRON_SECRET | eKOQELrM0Sv/YZLGqg2TIzFlKc5BEcKBwxvD/p4rVh8= | Production, Preview, Development |

---

## 步骤 3: 部署到 Vercel

### 3.1 方式一：通过 Git 推送自动部署（推荐）

```bash
# 确保所有更改已提交
git status

# 如果有未提交的更改，先提交
git add -A
git commit -m "chore: prepare for Vercel deployment"

# 推送到 main 分支
git push origin main
```

Vercel 会自动检测到推送并开始构建部署。

### 3.2 方式二：手动触发重新部署

1. 进入 Vercel Dashboard
2. 进入 Deployments 页面
3. 找到最新的部署
4. 点击右侧三个点 (•••)
5. 选择 "Redeploy"
6. 勾选 "Use existing Build Cache"（可选，加快构建速度）
7. 点击 "Redeploy"

### 3.3 方式三：使用 Vercel CLI

```bash
# 安装 Vercel CLI（如果还没安装）
npm i -g vercel

# 在 nextjs-frontend 目录中部署
cd nextjs-frontend
vercel --prod
```

---

## 步骤 4: 验证部署

### 4.1 检查构建日志

在 Vercel Dashboard 的 Deployments 页面：

1. 点击最新的部署
2. 查看构建日志
3. 确认没有错误

**预期看到**：
```
✓ Collecting page data
✓ Generating static pages
✓ Collecting build traces
✓ Finalizing page optimization
```

### 4.2 访问部署的网站

- **生产环境**: https://hf-ai-sigma.vercel.app
- **预览部署**: 每个分支和 PR 都会有独立的预览 URL

### 4.3 测试功能

访问网站后测试以下功能：

- [ ] 首页正常加载
- [ ] 日期选择器工作正常
- [ ] 论文列表能够加载（调用 Railway 后端 API）
- [ ] 搜索功能正常
- [ ] AI 论文解读功能（如果启用）
- [ ] Cron Job 端点受保护（直接访问 `/api/cron/prefetch` 应返回 401）

---

## 步骤 5: 配置 Vercel Cron Job

### 5.1 验证 Cron 配置

确认根目录的 `vercel.json` 包含：

```json
{
  "crons": [
    {
      "path": "/api/cron/prefetch",
      "schedule": "0 0 * * *"
    }
  ]
}
```

- **schedule**: "0 0 * * *" 表示每天午夜 UTC 时间运行
- **path**: 调用的 API 路径

### 5.2 注意事项

**Vercel Hobby Plan 限制**：
- Cron jobs 只能在 Production 环境运行
- 最多 2 个 cron jobs
- 最短间隔：每天（daily）

**Cron 工作流程**：
1. Vercel Cron 每天午夜调用 `/api/cron/prefetch`
2. 该端点验证 `CRON_SECRET`
3. 通过 `BACKEND_INTERNAL_URL` 调用 Railway 后端的 `/api/admin/prefetch/trigger`
4. 后端预取当天的论文数据
5. 返回结果给 Vercel

---

## 故障排查

### 问题 1: 构建失败 - "No Next.js version detected"

**原因**: Root Directory 未设置为 `nextjs-frontend`

**解决方案**:
1. Settings → General → Root Directory
2. 设置为 `nextjs-frontend`
3. 重新部署

### 问题 2: API 调用失败 - Network Error

**原因**: `NEXT_PUBLIC_API_URL` 未正确配置

**检查**:
```bash
# 在浏览器控制台检查
console.log(process.env.NEXT_PUBLIC_API_URL)
```

**解决方案**:
1. 确认环境变量已在 Vercel 中设置
2. 重新部署（环境变量更改需要重新部署）

### 问题 3: Cron Job 返回 401 Unauthorized

**原因**: `CRON_SECRET` 不匹配或未设置

**解决方案**:
1. 确认 Vercel 环境变量中的 `CRON_SECRET` 与生成的值一致
2. 确认应用到了 Production 环境
3. 重新部署

### 问题 4: CORS 错误

**原因**: Railway 后端的 CORS 配置未包含 Vercel 域名

**解决方案**:
在 Railway 中添加环境变量：
```
FRONTEND_URL=https://hf-ai-sigma.vercel.app
```

然后后端会自动将其添加到允许的 origins 列表。

---

## 性能优化建议

### 1. 启用 Edge Functions（可选）

对于简单的 API routes，可以使用 Edge Functions 获得更快的响应：

```typescript
// app/api/some-route/route.ts
export const runtime = 'edge';
```

### 2. 配置缓存

在 `next.config.ts` 中：

```typescript
const nextConfig = {
  // ... 其他配置
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
};
```

### 3. 图像优化

使用 Next.js Image 组件：

```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority
/>
```

---

## 监控和日志

### 查看实时日志

1. Vercel Dashboard → 项目 → Deployments
2. 点击某个部署 → "Functions" 标签
3. 点击某个函数查看实时日志

### 查看 Cron Job 日志

1. Vercel Dashboard → 项目 → Cron Jobs
2. 点击 job 查看执行历史
3. 查看每次执行的日志和结果

### 错误追踪（可选）

考虑集成错误追踪服务：
- Sentry
- LogRocket
- Vercel Analytics

---

## 环境变量清单

部署前确认已配置：

- [x] `NEXT_PUBLIC_API_URL` - Railway 后端 URL
- [x] `BACKEND_INTERNAL_URL` - Railway 后端 URL（内部）
- [x] `CRON_SECRET` - Cron Job 认证密钥
- [ ] `NEXT_PUBLIC_ENABLE_AI_INTERPRETATION` - AI 功能开关（可选）

---

## 相关文档

- [Vercel 部署文档](https://vercel.com/docs/deployments)
- [Next.js 环境变量](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Next.js 部署](https://nextjs.org/docs/app/building-your-application/deploying)

---

**最后更新**: 2025-10-29
**部署状态**: 待部署
