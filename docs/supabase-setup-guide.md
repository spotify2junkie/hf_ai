# Supabase 数据库配置指南

本文档说明如何为项目配置 Supabase PostgreSQL 数据库。

## 为什么需要数据库？

配置数据库后，你将获得以下功能：

✅ **翻译缓存持久化** - 论文摘要的中文翻译会被保存，避免重复翻译
✅ **数据持久化** - 论文数据会被缓存，减少对 HuggingFace API 的调用
✅ **更快的响应速度** - 从数据库读取比调用外部 API 快得多
✅ **离线支持** - 即使 HuggingFace API 暂时不可用，仍可访问已缓存的论文

---

## 步骤 1: 创建 Supabase 项目

### 1.1 注册/登录 Supabase

访问 https://supabase.com/dashboard

- 如果已有账号，直接登录
- 如果是新用户，使用 GitHub 账号注册（推荐）

### 1.2 创建新项目

1. 点击 "New Project" 按钮
2. 填写项目信息：
   - **Name**: `hf-ai` 或任何你喜欢的名字
   - **Database Password**: 生成一个强密码（**重要：保存这个密码！**）
   - **Region**: 选择 `Southeast Asia (Singapore)` 或离你最近的区域
   - **Pricing Plan**: 选择 Free tier（对于开发完全够用）

3. 点击 "Create new project"
4. 等待 1-2 分钟，数据库初始化完成

---

## 步骤 2: 获取数据库连接字符串

### 2.1 进入数据库设置

1. 在 Supabase Dashboard 中，点击左侧 **"Project Settings"**（齿轮图标）
2. 点击 **"Database"** 选项卡
3. 滚动到 **"Connection string"** 部分

### 2.2 复制连接字符串

你会看到两种连接字符串：

#### **Connection Pooling** (用于 Prisma - 推荐)

这个字符串用于 `DATABASE_URL`：

```
postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=10
```

**重要修改**：
- 将 `[YOUR-PASSWORD]` 替换为你在步骤 1.2 中设置的数据库密码
- 添加 `&connection_limit=5&pool_timeout=10` 参数（如果没有的话）

#### **Direct connection** (用于 Migrations)

这个字符串用于 `DIRECT_URL`：

```
postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**重要修改**：
- 将 `[YOUR-PASSWORD]` 替换为你的数据库密码
- 注意端口是 `5432`（不是 6543）

### 2.3 保存连接字符串

创建一个临时文件保存这两个字符串，稍后会用到：

```bash
# DATABASE_URL (用于 Prisma 查询，通过 PgBouncer 连接池)
DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=10"

# DIRECT_URL (用于 Prisma Migrations，直接连接)
DIRECT_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

---

## 步骤 3: 在 Railway 配置环境变量

### 3.1 进入 Railway 项目设置

1. 访问 https://railway.app/
2. 进入你的 `hf-ai` 项目
3. 点击你的服务（backend）
4. 点击 **"Variables"** 标签

### 3.2 添加数据库环境变量

点击 **"New Variable"**，添加以下两个变量：

#### 变量 1: DATABASE_URL

```
Name: DATABASE_URL
Value: postgresql://postgres.xxxxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=10
```

（用你实际的连接字符串替换）

#### 变量 2: DIRECT_URL

```
Name: DIRECT_URL
Value: postgresql://postgres.xxxxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

（用你实际的直接连接字符串替换）

#### 可选：数据库并发限制

```
Name: DB_CONCURRENCY_LIMIT
Value: 3
```

这个值应该 ≤ connection_limit（我们在 DATABASE_URL 中设置为 5）

### 3.3 保存并重新部署

1. 点击 "Add" 保存环境变量
2. Railway 会自动触发重新部署
3. 等待部署完成（大约 1-2 分钟）

---

## 步骤 4: 运行 Prisma Migrations

现在需要在数据库中创建表结构。

### 4.1 方式一：通过 Railway CLI（推荐）

如果你本地有 Railway CLI：

```bash
# 安装 Railway CLI（如果还没有）
npm install -g @railway/cli

# 登录 Railway
railway login

# 链接到项目
railway link

# 进入 backend 目录
cd backend

# 运行 migration
railway run npx prisma migrate deploy
```

### 4.2 方式二：通过 Railway Dashboard 手动触发

如果没有 CLI，可以在 Railway Dashboard 中：

1. 进入服务 → **"Settings"** 标签
2. 滚动到 **"Deploy"** 部分
3. 在 **"Build Command"** 中临时添加 migration：

```bash
npm install && npx prisma generate && npx prisma migrate deploy
```

4. 点击 "Save"
5. 触发重新部署
6. 部署成功后，将 Build Command 改回原来的：

```bash
npm install && npx prisma generate
```

### 4.3 方式三：在本地运行（需要本地环境）

如果你在本地有项目：

```bash
# 进入 backend 目录
cd backend

# 设置环境变量（临时）
export DATABASE_URL="你的DATABASE_URL"
export DIRECT_URL="你的DIRECT_URL"

# 运行 migration
npx prisma migrate deploy

# 如果没有 migration 文件，先创建
npx prisma migrate dev --name init
```

---

## 步骤 5: 验证数据库配置

### 5.1 检查 Railway 部署日志

在 Railway Dashboard 中：

1. 点击你的服务
2. 点击 **"Deployments"** 标签
3. 查看最新部署的日志

**成功标志**：
```
✅ Prisma Client generated successfully
🚀 Backend server running on port 3001
📡 Health check: http://localhost:3001/health
✅ Cron scheduler initialized
```

**不应该再看到**：
```
⚠️ Database not configured - translations will not be persisted
```

如果看到数据库错误，说明连接字符串配置有问题。

### 5.2 检查 Supabase 数据库表

在 Supabase Dashboard 中：

1. 点击左侧 **"Table Editor"**
2. 你应该能看到 `papers` 表
3. 表结构应该包含以下列：
   - id (uuid)
   - paper_id (text)
   - title (text)
   - authors (jsonb)
   - abstract (text)
   - abstract_zh (text)
   - pdf_url (text)
   - topics (jsonb)
   - published_date (date)
   - upvotes (int4)
   - fetched_at (timestamptz)
   - updated_at (timestamptz)
   - cache_expires_at (timestamptz)

### 5.3 测试数据库连接

访问后端的 papers API：

```bash
curl "https://hfai-production.up.railway.app/api/papers?date=2024-10-29"
```

**第一次调用**：
- 从 HuggingFace API 获取数据
- 保存到 Supabase 数据库

**第二次调用**：
- 直接从数据库读取（更快！）
- Railway 日志应显示 Prisma 查询

---

## 步骤 6: 配置数据库索引（可选但推荐）

为了更好的性能，确保数据库有正确的索引。Prisma migrations 应该已经创建了这些索引，但你可以在 Supabase SQL Editor 中验证：

```sql
-- 查看现有索引
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'papers';
```

应该看到以下索引：
- `papers_published_date_idx` - 按发布日期排序
- `papers_cache_expires_at_idx` - 查找过期缓存
- `papers_published_date_paper_id_idx` - 组合索引

如果缺少，可以手动创建：

```sql
-- 发布日期索引（降序）
CREATE INDEX IF NOT EXISTS papers_published_date_idx
ON papers (published_date DESC);

-- 缓存过期时间索引
CREATE INDEX IF NOT EXISTS papers_cache_expires_at_idx
ON papers (cache_expires_at);

-- 组合索引
CREATE INDEX IF NOT EXISTS papers_published_date_paper_id_idx
ON papers (published_date, paper_id);
```

---

## 故障排查

### 问题 1: "Invalid connection string" 错误

**原因**: 连接字符串格式不正确或密码包含特殊字符

**解决方案**:
1. 确保密码中的特殊字符被正确编码（URL encode）
2. 使用 `encodeURIComponent()` 编码密码
3. 或者在 Supabase 中重置密码，使用只包含字母和数字的密码

### 问题 2: "Connection timeout" 错误

**原因**: Railway 无法连接到 Supabase

**解决方案**:
1. 确认 Supabase 项目区域与 Railway 部署区域接近
2. 检查 `connection_limit` 和 `pool_timeout` 参数
3. 尝试增加 `pool_timeout` 到 15-20 秒

### 问题 3: "Too many connections" 错误

**原因**: 连接池耗尽

**解决方案**:
1. 减少 `DB_CONCURRENCY_LIMIT`（设为 2 或 3）
2. 增加 `connection_limit`（但不要超过 10）
3. 确保 Prisma Client 正确断开连接

### 问题 4: Migration 失败

**原因**: 数据库中已有冲突的表或 schema

**解决方案**:
```sql
-- 在 Supabase SQL Editor 中删除现有表（谨慎！）
DROP TABLE IF EXISTS papers CASCADE;
DROP TABLE IF EXISTS _prisma_migrations CASCADE;

-- 然后重新运行 migration
```

### 问题 5: 数据没有被缓存

**原因**: 环境变量未正确加载

**解决方案**:
1. 在 Railway Dashboard 中重新检查环境变量
2. 确保变量名完全匹配（区分大小写）
3. 触发重新部署以应用更改

---

## 数据库维护

### 清理过期缓存

定期清理过期的缓存数据：

```sql
-- 删除 7 天前过期的缓存
DELETE FROM papers
WHERE cache_expires_at < NOW() - INTERVAL '7 days';
```

可以在 Supabase 中设置一个 PostgreSQL Function + Cron Job 自动执行。

### 查看数据库使用情况

```sql
-- 查看总论文数
SELECT COUNT(*) FROM papers;

-- 查看按日期分布
SELECT published_date, COUNT(*)
FROM papers
GROUP BY published_date
ORDER BY published_date DESC;

-- 查看有翻译的论文数
SELECT COUNT(*)
FROM papers
WHERE abstract_zh IS NOT NULL;

-- 查看数据库大小
SELECT pg_size_pretty(pg_database_size('postgres'));
```

---

## 性能优化建议

### 1. 连接池配置

对于 Railway（单实例）：
```
connection_limit=5
pool_timeout=10
```

对于多实例部署：
```
connection_limit=3
pool_timeout=15
```

### 2. 查询优化

Prisma 已经优化了查询，但如果遇到性能问题：

- 使用 `select` 只获取需要的字段
- 使用 `take` 限制结果数量
- 确保索引正确创建

### 3. 缓存策略

当前配置：
- 历史论文：24 小时缓存
- 今天的论文：1 小时缓存（因为会频繁更新）

可以在 `backend/src/services/papers-cache.js` 中调整。

---

## 安全最佳实践

### 1. 保护数据库凭证

- ✅ 永远不要将 DATABASE_URL 提交到 Git
- ✅ 使用环境变量管理敏感信息
- ✅ 定期轮换数据库密码

### 2. 启用 Row Level Security (RLS)

在 Supabase SQL Editor 中：

```sql
-- 启用 RLS
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

-- 允许所有读取（因为是公开数据）
CREATE POLICY "Allow public read access"
ON papers FOR SELECT
USING (true);

-- 只允许服务端写入（通过 API key）
CREATE POLICY "Allow service role write access"
ON papers FOR ALL
USING (auth.role() = 'service_role');
```

### 3. 监控数据库活动

在 Supabase Dashboard → **"Database"** → **"Logs"**：

- 查看慢查询
- 监控连接数
- 检查错误日志

---

## 下一步

配置完成后：

1. ✅ Railway 后端应该能够正常连接到数据库
2. ✅ 论文数据会被缓存到 Supabase
3. ✅ 翻译会被持久化保存
4. ✅ 应用响应速度显著提升

现在可以继续：
- 配置 Vercel 环境变量
- 部署前端
- 端到端测试

---

**参考文档**:
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma with Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

---

**最后更新**: 2025-10-30
