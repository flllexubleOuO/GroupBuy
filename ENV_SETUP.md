# 环境变量配置指南

本指南说明如何在 EC2 服务器上配置环境变量。

## 📋 必需的环境变量

### 最小配置

在 EC2 服务器上创建 `.env` 文件：

```bash
cd /home/ec2-user/tuangou-project
nano .env
```

添加以下内容：

```env
# 应用配置
NODE_ENV=production
PORT=3000

# 数据库配置（SQLite）
DATABASE_URL="file:./prisma/prod.db"

# Shopify 配置
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=your-access-token
SHOPIFY_API_VERSION=2024-01

# 管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password

# Session 密钥
SESSION_SECRET=your-random-secret-key
```

## 🔧 详细说明

### 1. DATABASE_URL

**SQLite 数据库路径**（推荐用于简单部署）：

```env
DATABASE_URL="file:./prisma/prod.db"
```

数据库文件会保存在 `prisma/prod.db`。确保 `prisma` 目录存在且有写权限。

**PostgreSQL 数据库**（如果需要）：

```env
DATABASE_URL="postgresql://username:password@localhost:5432/dbname?schema=public"
```

### 2. Shopify 配置

获取 Shopify Admin API Access Token：

1. 登录 Shopify 管理后台
2. 进入 **Settings** → **Apps and sales channels** → **Develop apps**
3. 创建新应用或使用现有应用
4. 配置 Admin API scopes（需要 `read_products`, `write_orders` 等权限）
5. 安装应用并获取 Access Token

### 3. Session Secret

生成安全的随机密钥：

```bash
# 在 EC2 服务器上执行
openssl rand -hex 32
```

将生成的字符串作为 `SESSION_SECRET` 的值。

### 4. 管理员密码

**请务必修改默认密码**！使用强密码：

```env
ADMIN_PASSWORD=your-very-strong-password-here
```

## 🚀 首次部署时的配置

### 方法 1: 手动创建（推荐）

在首次部署前，SSH 连接到 EC2 并创建 `.env` 文件：

```bash
ssh ec2-user@your-ec2-ip
cd /home/ec2-user/tuangou-project
nano .env
# 粘贴配置内容
```

### 方法 2: 自动创建（使用默认值）

如果 `.env` 文件不存在，部署脚本会自动创建包含默认值的文件：

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="file:./prisma/prod.db"
```

**注意**：自动创建的文件只包含基本配置，您需要手动添加 Shopify 配置和其他敏感信息。

## ✅ 验证配置

部署后，检查环境变量是否正确加载：

```bash
# SSH 连接到 EC2
ssh ec2-user@your-ec2-ip
cd /home/ec2-user/tuangou-project

# 检查 .env 文件
cat .env

# 测试环境变量加载
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"
```

## 🔒 安全注意事项

1. **不要将 `.env` 文件提交到 Git**
   - `.env` 已在 `.gitignore` 中
   - GitHub Actions 部署时不会同步 `.env` 文件

2. **使用强密码**
   - 管理员密码应该足够复杂
   - Session Secret 应该使用随机生成的字符串

3. **保护敏感信息**
   - 不要在不安全的地方存储 `.env` 文件
   - 定期轮换密钥和密码

4. **文件权限**
   ```bash
   # 设置 .env 文件权限（仅所有者可读写）
   chmod 600 .env
   ```

## 🐛 常见问题

### Q1: 部署时提示 "Environment variable not found: DATABASE_URL"

**原因**：`.env` 文件不存在或未正确配置

**解决方案**：
1. 检查 `.env` 文件是否存在
2. 确保 `DATABASE_URL` 在文件中
3. 检查文件格式（不要有多余的空格）

### Q2: 数据库文件权限错误

**解决方案**：
```bash
# 确保 prisma 目录存在且有写权限
mkdir -p prisma
chmod 755 prisma
```

### Q3: 如何更新环境变量？

**解决方案**：
1. SSH 连接到 EC2
2. 编辑 `.env` 文件：`nano .env`
3. 修改相应的值
4. 重启应用：`pm2 restart group-buy-system`

### Q4: 如何备份环境变量？

**解决方案**：
```bash
# 备份 .env 文件（不要提交到 Git）
cp .env .env.backup
```

## 📝 完整配置示例

```env
# ============================================
# 应用配置
# ============================================
NODE_ENV=production
PORT=3000

# ============================================
# 数据库配置
# ============================================
# SQLite（简单部署）
DATABASE_URL="file:./prisma/prod.db"

# PostgreSQL（生产环境推荐）
# DATABASE_URL="postgresql://user:password@localhost:5432/groupbuy?schema=public"

# ============================================
# Shopify 配置
# ============================================
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxx
SHOPIFY_API_VERSION=2024-01

# ============================================
# 管理员配置
# ============================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-very-strong-password-123!@#

# ============================================
# Session 配置
# ============================================
# 生成方法: openssl rand -hex 32
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

# ============================================
# 文件上传配置
# ============================================
UPLOAD_DEST=./public/uploads
UPLOAD_MAX_SIZE=5242880
```

## 🔗 相关文档

- [Prisma 环境变量文档](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#environment-variables)
- [dotenv 文档](https://github.com/motdotla/dotenv)

