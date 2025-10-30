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

## 相关文档

- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Railway Deployment Documentation](https://docs.railway.app/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Express CORS Configuration](https://expressjs.com/en/resources/middleware/cors.html)

---

**最后更新**: 2025-10-29
**部署状态**: ✅ 成功运行
