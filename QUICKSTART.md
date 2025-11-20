# 快速启动指南

## 开发环境快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，确保 Shopify 凭证正确。

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 创建数据库和表
npx prisma migrate dev --name init
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问：
- 前台下单页面: http://localhost:3000/order
- 后台管理: http://localhost:3000/admin/login
  - 默认账号: admin / admin123

## 生产环境构建

```bash
# 构建项目
npm run build

# 启动生产服务器
npm start
```

或使用 PM2：

```bash
pm2 start ecosystem.config.js --env production
```

## Docker 部署

```bash
# 启动所有服务（包括 PostgreSQL）
docker-compose up -d

# 运行数据库迁移
docker-compose exec app npx prisma migrate deploy

# 查看日志
docker-compose logs -f app
```

## 常见问题

### 数据库连接失败

确保 `.env` 中的 `DATABASE_URL` 正确配置。

### Shopify API 调用失败

检查：
1. `SHOPIFY_STORE_DOMAIN` 是否正确
2. `SHOPIFY_ADMIN_API_ACCESS_TOKEN` 是否有效
3. API Token 是否有足够的权限

### 文件上传失败

确保 `public/uploads` 目录存在且有写权限：

```bash
mkdir -p public/uploads
chmod 755 public/uploads
```

