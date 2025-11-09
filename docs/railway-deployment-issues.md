# Railway 部署问题记录

本文档记录了在将后端部署到 Railway 时遇到的所有问题及解决方案。

## 部署信息

- **后端 URL**: https://hfai-production.up.railway.app
- **部署平台**: Railway
- **技术栈**: Node.js + Express + Prisma
- **部署日期**: 2025-10-29

---

## 问题 1: Prisma Client 找不到生成的模块

### 错误信息
```
Error: Cannot find module '../generated/prisma'
at /app/src/services/prisma.js:9:26
```

### 原因分析
- Prisma Client 在构建时没有被生成
- 容器启动时缺少 `prisma generate` 步骤

### 解决方案
在 `backend/package.json` 中添加 postinstall 脚本：

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

这样在 `npm install` 后会自动生成 Prisma Client。

---

## 问题 2: Dockerfile 中缺少 Prisma Schema 文件

### 错误信息
```
Error: Could not find Prisma Schema that is required for this command.
Checked following paths:
- schema.prisma: file not found
- prisma/schema.prisma: file not found
```

### 原因分析
- Dockerfile 只复制了 `package.json` 和 `src/` 目录
- 没有复制 `prisma/` 目录，导致无法找到 schema 文件

### 解决方案
修改 `backend/Dockerfile`，在安装依赖前复制 Prisma 目录：

```dockerfile
# Copy package files
COPY package*.json ./

# Copy Prisma schema - 必须在 npm install 之前
COPY prisma ./prisma/

# Install dependencies (this will run postinstall and generate Prisma client)
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
```

**关键点**: Prisma 目录必须在 `npm install` 之前复制，因为 postinstall 脚本需要读取 schema.prisma 文件。

---

## 问题 3: UUID 模块 ES Module 兼容性错误

### 错误信息
```
Error [ERR_REQUIRE_ESM]: require() of ES Module /app/node_modules/uuid/dist-node/index.js
from /app/src/services/pdf-handler.js not supported.

Instead change the require of index.js in /app/src/services/pdf-handler.js to a dynamic
import() which is available in all CommonJS modules.
```

### 原因分析
- `uuid` v13 是纯 ES Module，不支持 CommonJS 的 `require()`
- 后端代码使用的是 CommonJS (`require()`)
- 版本不兼容导致模块加载失败

### 解决方案
将 `uuid` 降级到支持 CommonJS 的版本：

```json
{
  "dependencies": {
    "uuid": "^9.0.1"  // 从 "^13.0.0" 降级
  }
}
```

**注意**: uuid v9 是最后一个同时支持 CommonJS 和 ES Module 的版本。

---

## 问题 4: package-lock.json 不匹配

### 错误信息
```
npm error Invalid: lock file's uuid@13.0.0 does not satisfy uuid@9.0.1
npm error need to update lockfile or run with --force
```

### 原因分析
- 修改了 `package.json` 但没有更新 `package-lock.json`
- Lock file 仍然锁定在 uuid v13

### 解决方案
```bash
cd backend
npm install  # 重新生成 package-lock.json
git add package.json package-lock.json
git commit -m "fix: downgrade uuid to v9 for CommonJS compatibility"
git push
```

**关键点**: 修改依赖版本后必须重新运行 `npm install` 来更新 lock file。

---

## 问题 5: CORS 阻止 Railway Health Check 请求

### 错误信息
```
⚠️  CORS blocked request with no origin header
⚠️  CORS blocked request with no origin header
⚠️  CORS blocked request with no origin header
```

### 原因分析
- Railway 的健康检查请求不包含 `Origin` header
- 后端在生产环境要求所有请求必须有 `Origin` header
- 导致健康检查请求被 CORS 策略拒绝（虽然不影响功能，但会产生大量警告日志）

### 解决方案
修改 `backend/src/server.js` 中的 CORS 配置：

```javascript
const corsOptions = {
  origin: (origin, callback) => {
    // 允许没有 Origin header 的请求（健康检查、curl、Postman 等）
    // Railway 健康检查和监控工具不发送 Origin headers
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
```

**改动说明**:
- 移除了对 `NODE_ENV === 'production'` 的检查
- 无条件允许没有 Origin header 的请求
- 仍然会验证有 Origin header 的请求，保持安全性

---

## 部署配置文件

### railway.toml

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install && npx prisma generate"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### Dockerfile 完整版本

```dockerfile
# Backend Dockerfile for Daily Paper Extractor MVP

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema
COPY prisma ./prisma/

# Install dependencies (this will run postinstall and generate Prisma client)
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["npm", "start"]
```

---

## 部署成功验证

### 健康检查测试
```bash
curl -i https://hfai-production.up.railway.app/health
```

**成功响应**:
```
HTTP/2 200
{"status":"OK","timestamp":"2025-10-29T17:08:55.940Z"}
```

### 服务启动日志
```
🚀 Backend server running on port 3001
📡 Health check: http://localhost:3001/health
✅ Cron scheduler initialized
🧹 Scheduling temp file and cache cleanup (runs every hour)
```

---

## 经验总结

### 1. Prisma 部署注意事项
- ✅ 必须在 Dockerfile 中复制 `prisma/` 目录
- ✅ 添加 postinstall 脚本自动生成 Prisma Client
- ✅ 确保 Prisma 目录在 `npm install` 之前复制

### 2. 依赖版本兼容性
- ✅ 注意 CommonJS vs ES Module 兼容性
- ✅ uuid v13 只支持 ES Module，需要降级到 v9
- ✅ 修改 package.json 后必须重新生成 package-lock.json

### 3. CORS 配置
- ✅ 生产环境需要允许无 Origin header 的健康检查请求
- ✅ Railway/监控工具的健康检查不发送 Origin header
- ✅ 保留对实际浏览器请求的 Origin 验证

### 4. Docker 构建顺序
正确的顺序：
1. 复制 package.json 和 package-lock.json
2. 复制 prisma/ 目录
3. 运行 npm install（触发 postinstall 生成 Prisma Client）
4. 复制源代码

### 5. 部署检查清单
- [ ] Dockerfile 包含所有必要文件
- [ ] package-lock.json 与 package.json 匹配
- [ ] 所有依赖支持当前模块系统（CommonJS/ESM）
- [ ] CORS 配置允许健康检查
- [ ] 环境变量已正确设置
- [ ] 健康检查端点正常响应

---

## 问题 6: 生产域名 CORS 阻塞

### 错误信息
```
Access to fetch at 'https://hfai-production.up.railway.app/api/papers?date=2025-11-08'
from origin 'https://hfpaper.dev' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### 原因分析
- 前端使用自定义域名 `hfpaper.dev` (通过 Vercel 部署)
- CORS 配置只允许 `*.vercel.app` 域名和环境变量中的 `FRONTEND_URL`
- 自定义域名不匹配任何已配置的白名单规则

### 解决方案

#### 方案 1: 添加环境变量（推荐）
在 Railway 环境变量中添加：
```bash
FRONTEND_URL=https://hfpaper.dev
```

#### 方案 2: 硬编码域名检查（已实施）
修改 `backend/src/server.js` 中的 CORS 配置：

```javascript
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (health checks, curl, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Allow all Vercel deployment URLs (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Allow custom domains pointing to Vercel (hfpaper.dev, etc.)
    // Match both http and https versions
    if (origin.includes('hfpaper.dev')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
```

**优点**:
- 无需修改环境变量即可工作
- 同时支持 http 和 https
- 保持其他域名的安全验证

---

## 问题 7: 自动化数据预取配置

### 需求
- 每 6 小时自动获取最近 3 天的论文
- 自动翻译摘要为中文
- 服务器启动时可选择立即执行一次

### 解决方案

#### Railway 环境变量配置

在 Railway 项目设置中添加以下环境变量：

```bash
# Cron Job 配置
CRON_ENABLED=true                      # 启用定时任务
PREFETCH_DAYS=3                        # 预取最近 3 天的论文
PREFETCH_CRON_SCHEDULE=0 */6 * * *     # 每 6 小时执行一次
TRANSLATE_ON_PREFETCH=true             # 预取时自动翻译
PREFETCH_ON_STARTUP=false              # 启动时不立即执行
TZ=UTC                                 # 时区设置为 UTC
```

#### Cron Schedule 格式说明

```
分钟 小时 日期 月份 星期
│   │   │   │   │
│   │   │   │   └─── 星期几 (0 - 7) (0 和 7 都表示周日)
│   │   │   └─────── 月份 (1 - 12)
│   │   └───────────  日期 (1 - 31)
│   └───────────────  小时 (0 - 23)
└───────────────────  分钟 (0 - 59)
```

**常用示例**:
- `0 */6 * * *` - 每 6 小时 (00:00, 06:00, 12:00, 18:00 UTC)
- `0 0 * * *` - 每天午夜 (00:00 UTC)
- `0 12 * * *` - 每天中午 (12:00 UTC)
- `0 6 * * *` - 每天早上 6 点 (06:00 UTC)

**注意**: Vercel Hobby 计划只支持每天一次的 cron job。

#### 后台脚本

##### 1. 一次性获取历史数据
```bash
# 获取最近 30 天（不翻译，速度更快）
SKIP_TRANSLATION=true node scripts/fetch-last-30-days.js

# 获取最近 60 天（包含翻译）
DAYS=60 node scripts/fetch-last-30-days.js

# 仅获取最近 7 天
DAYS=7 node scripts/fetch-last-30-days.js
```

##### 2. 翻译缺失的中文摘要
```bash
# 预览需要翻译的论文
DRY_RUN=true node scripts/translate-missing-abstracts.js

# 实际执行翻译（批量大小 10）
node scripts/translate-missing-abstracts.js

# 自定义批量大小
BATCH_SIZE=20 node scripts/translate-missing-abstracts.js
```

#### 实施步骤

1. **设置 Railway 环境变量**:
   - 进入 Railway 项目仪表板
   - 点击后端服务
   - 进入 "Variables" 标签
   - 添加上述 6 个环境变量
   - 保存后会自动重新部署

2. **验证 Cron 是否运行**:
   查看 Railway 日志应该看到：
   ```
   ✅ Cron scheduler initialized
   📅 Cron schedule: 0 */6 * * * (Every 6 hours)
   📊 Will prefetch last 3 days
   🌏 Translation enabled
   ```

3. **监控执行情况**:
   每次 cron 执行时会看到日志：
   ```
   🤖 [CRON] Starting scheduled prefetch...
   📅 Prefetching papers for 2025-11-08...
   ✅ Prefetch completed for 2025-11-08
   ```

---

## 数据管理脚本

### 可用脚本

#### `fetch-last-30-days.js`
一次性获取历史数据的脚本

**特性**:
- 可配置天数（默认 30 天）
- 可选择跳过翻译（加快速度）
- 自动跳过已缓存的日期
- 详细进度报告

**使用方法**:
```bash
# 基本用法 - 获取最近 30 天
node scripts/fetch-last-30-days.js

# 跳过翻译（更快）
SKIP_TRANSLATION=true node scripts/fetch-last-30-days.js

# 自定义天数
DAYS=60 node scripts/fetch-last-30-days.js

# 组合使用
DAYS=90 SKIP_TRANSLATION=true node scripts/fetch-last-30-days.js
```

#### `translate-missing-abstracts.js`
翻译所有缺失中文摘要的脚本

**特性**:
- 自动查找缺失中文摘要的论文
- 批量处理（默认每批 10 篇）
- 速率限制（每篇论文间隔 2 秒）
- 错误处理和重试
- 详细的成功率报告

**使用方法**:
```bash
# 预览模式 - 查看需要翻译的论文
DRY_RUN=true node scripts/translate-missing-abstracts.js

# 实际翻译
node scripts/translate-missing-abstracts.js

# 自定义批量大小
BATCH_SIZE=20 node scripts/translate-missing-abstracts.js

# 后台运行（推荐用于大量翻译）
node scripts/translate-missing-abstracts.js > translation.log 2>&1 &
```

**输出示例**:
```
======================================================================
🌏 MISSING CHINESE ABSTRACTS TRANSLATION
======================================================================
📊 Batch size: 10
⏰ Started: 2025-11-08T16:45:56.127Z

🔍 Finding papers without Chinese abstracts...
✅ Found 589 papers without Chinese translations

[1/589] Processing: 2510.20976
  Title: L^2M^3OF: A Large Language Multimodal Model...
  🌏 Translating...
  ✅ Success! Translated: 608 chars

📊 TRANSLATION SUMMARY
✅ Successful: 589
❌ Failed: 0
📈 Success rate: 100.0%
```

---

## 环境变量完整清单

### Railway Backend 必需环境变量

```bash
# 服务器配置
PORT=3001                              # 服务端口（Railway 自动设置）
NODE_ENV=production                    # 环境模式

# 外部 API
HUGGINGFACE_API_URL=https://huggingface.co/api/daily_papers
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxx    # 阿里云 DashScope API 密钥

# 数据库配置（Supabase）
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true&connection_limit=1&connect_timeout=30&pool_timeout=30
DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?connect_timeout=30

# 前端 CORS（可选，已硬编码 hfpaper.dev）
FRONTEND_URL=https://hfpaper.dev

# Cron 任务配置
CRON_ENABLED=true                      # 启用定时任务
PREFETCH_DAYS=3                        # 预取天数
PREFETCH_CRON_SCHEDULE=0 */6 * * *     # Cron 计划表达式
TRANSLATE_ON_PREFETCH=true             # 预取时自动翻译
PREFETCH_ON_STARTUP=false              # 启动时不立即执行
TZ=UTC                                 # 时区

# 数据库并发控制（可选）
DB_CONCURRENCY_LIMIT=3                 # 最大并发数据库操作
```

### Vercel Frontend 环境变量

```bash
NEXT_PUBLIC_API_URL=https://hfai-production.up.railway.app
```

---

## 相关文档

- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Railway Deployment Documentation](https://docs.railway.app/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Express CORS Configuration](https://expressjs.com/en/resources/middleware/cors.html)
- [Node-Cron Documentation](https://github.com/node-cron/node-cron)
- [DashScope API Documentation](https://help.aliyun.com/zh/dashscope/)

---

## 部署检查清单（更新版）

- [ ] Dockerfile 包含所有必要文件
- [ ] package-lock.json 与 package.json 匹配
- [ ] 所有依赖支持当前模块系统（CommonJS/ESM）
- [ ] CORS 配置允许健康检查和生产域名
- [ ] 数据库连接字符串正确配置（端口 6543 用于 pooler）
- [ ] DASHSCOPE_API_KEY 已设置
- [ ] Cron 环境变量已配置（如需自动预取）
- [ ] 时区设置正确（TZ=UTC）
- [ ] 健康检查端点正常响应
- [ ] 前端可以成功调用后端 API（无 CORS 错误）

---

**最后更新**: 2025-11-08
**部署状态**: ✅ 成功运行
**新功能**:
- ✅ 自动化论文预取（每 6 小时）
- ✅ 自动中文翻译
- ✅ 全局搜索和排序功能
- ✅ 支持自定义域名 CORS
