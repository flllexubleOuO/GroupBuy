# 快速开始指南

本指南帮助您快速启动和运行团购系统。

## 📋 目录

1. [开发环境快速启动](#1-开发环境快速启动)
2. [生产环境构建](#2-生产环境构建)
3. [Docker 部署](#3-docker-部署)
4. [数据库迁移](#4-数据库迁移)
5. [常见问题](#5-常见问题)

---

## 1. 开发环境快速启动

### 1.1 安装依赖

```bash
npm install
```

### 1.2 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，确保 Shopify 凭证正确：

```env
SHOPIFY_STORE_DOMAIN=rhrw1p-nb.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=your-access-token
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 1.3 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 创建数据库和表
npx prisma migrate dev --name init
```

### 1.4 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

访问：
- 前台下单页面: http://localhost:3000/order
- 后台管理: http://localhost:3000/admin/login
  - 默认账号: admin / admin123

---

## 2. 生产环境构建

### 2.1 构建项目

```bash
# 构建项目
npm run build
```

### 2.2 启动生产服务器

#### 方法 1: 使用 npm

```bash
npm start
```

#### 方法 2: 使用 PM2（推荐）

```bash
pm2 start ecosystem.config.js --env production
```

### 2.3 PM2 管理命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs group-buy-system

# 重启应用
pm2 restart group-buy-system

# 停止应用
pm2 stop group-buy-system

# 设置开机自启
pm2 startup
pm2 save
```

---

## 3. Docker 部署

### 3.1 使用 Docker Compose

1. **配置 `.env` 文件**（参考步骤 1.2）

2. **启动服务**：
   ```bash
   docker-compose up -d
   ```

3. **运行数据库迁移**：
   ```bash
   docker-compose exec app npx prisma migrate deploy
   ```

4. **查看日志**：
   ```bash
   docker-compose logs -f app
   ```

### 3.2 仅使用 Dockerfile

```bash
# 构建镜像
docker build -t group-buy-system .

# 运行容器（需要外部 PostgreSQL）
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/public/uploads:/app/public/uploads \
  group-buy-system
```

---

## 4. 数据库迁移

### 4.1 更新数据库 Schema

当您修改了 `prisma/schema.prisma` 文件后，需要运行数据库迁移。

#### 开发环境

```bash
# 生成 Prisma Client
npx prisma generate

# 创建迁移
npx prisma migrate dev --name your_migration_name
```

这将：
- 创建迁移文件
- 应用迁移到数据库
- 重新生成 Prisma Client

#### 生产环境

```bash
# 应用迁移（不创建新迁移）
npx prisma migrate deploy
```

**注意**：生产环境使用 `migrate deploy`，它只应用已存在的迁移文件，不会创建新迁移。

### 4.2 套餐功能迁移

由于添加了套餐功能，需要运行数据库迁移来创建 `Package` 表。

#### 步骤

1. **生成 Prisma Client**（如果还没有）：
   ```bash
   npx prisma generate
   ```

2. **创建迁移**：
   ```bash
   npx prisma migrate dev --name add_package_model
   ```

   这将：
   - 创建 `Package` 表
   - 在 `Order` 表中添加 `packageId` 字段

3. **如果是在生产环境**，使用：
   ```bash
   npx prisma migrate deploy
   ```

### 4.3 功能说明

#### 套餐管理

1. **访问套餐管理页面**：
   - 登录后台：`http://localhost:3000/admin/login`
   - 点击"套餐管理"或访问：`http://localhost:3000/admin/packages`

2. **创建套餐**：
   - 点击"创建套餐"按钮
   - 填写套餐信息：
     - 套餐名称（必填）
     - 套餐描述（可选）
     - 套餐价格（必填）
     - 图片URL（可选）
     - 排序顺序
     - 状态（启用/禁用）
   - 添加商品列表：
     - 商品名称
     - 单价
     - 数量
   - 点击"创建"保存

3. **编辑套餐**：
   - 在套餐卡片上点击"编辑"按钮
   - 修改信息后点击"保存"

4. **删除套餐**：
   - 在套餐卡片上点击"删除"按钮
   - 确认删除

#### 前台下单

- 用户访问下单页面时，只会看到**已启用**的套餐
- 用户可以选择多个套餐，每个套餐可以设置数量
- 提交订单时，系统会将套餐中的所有商品展开为订单项

#### 订单关联

- 如果用户只选择了一个套餐，订单会关联该套餐ID
- 如果用户选择了多个套餐，订单不会关联套餐ID（packageId 为 null）

### 4.4 数据库管理工具

#### Prisma Studio

可视化数据库管理界面：

```bash
npx prisma studio
```

这将打开浏览器，显示数据库中的所有表和记录。

#### 常用 Prisma 命令

```bash
# 查看数据库状态
npx prisma migrate status

# 重置数据库（开发环境，会删除所有数据）
npx prisma migrate reset

# 查看数据库结构
npx prisma db pull

# 推送 schema 到数据库（不创建迁移）
npx prisma db push
```

---

## 5. 常见问题

### 5.1 数据库连接失败

**症状**：应用启动失败，提示数据库连接错误

**解决方案**：
- 确保 `.env` 中的 `DATABASE_URL` 正确配置
- 检查数据库文件是否存在（SQLite）
- 检查数据库服务是否运行（PostgreSQL）
- 验证数据库连接字符串格式

**SQLite 示例**：
```env
DATABASE_URL="file:./prisma/dev.db"
```

**PostgreSQL 示例**：
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
```

### 5.2 Shopify API 调用失败

**症状**：无法获取商品列表或创建订单失败

**检查清单**：
1. `SHOPIFY_STORE_DOMAIN` 是否正确
2. `SHOPIFY_ADMIN_API_ACCESS_TOKEN` 是否有效
3. API Token 是否有足够的权限：
   - `read_products` - 读取商品
   - `write_orders` - 创建订单
   - `read_orders` - 读取订单（可选）
4. API 版本是否正确：`SHOPIFY_API_VERSION=2024-01`

**测试 API Token**：
```bash
curl -H "X-Shopify-Access-Token: YOUR_TOKEN" \
  https://YOUR_STORE.myshopify.com/admin/api/2024-01/products.json
```

### 5.3 文件上传失败

**症状**：上传付款截图时失败

**解决方案**：
- 确保 `public/uploads` 目录存在且有写权限：
  ```bash
  mkdir -p public/uploads
  chmod 755 public/uploads
  ```
- 检查 `.env` 中的上传配置：
  ```env
  UPLOAD_DEST=./public/uploads
  UPLOAD_MAX_SIZE=5242880  # 5MB
  ```
- 检查磁盘空间：`df -h`

### 5.4 端口被占用

**症状**：启动时提示 `EADDRINUSE: address already in use`

**解决方案**：
```bash
# 查找占用端口的进程
sudo lsof -i :3000
# 或
sudo netstat -tulpn | grep 3000

# 杀死进程（替换 PID）
sudo kill -9 PID

# 或修改端口（在 .env 中）
PORT=3001
```

### 5.5 模块未找到

**症状**：启动时提示 `Cannot find module`

**解决方案**：
```bash
# 删除 node_modules 和 dist
rm -rf node_modules dist

# 重新安装依赖
npm install

# 重新构建
npm run build
```

### 5.6 环境变量未加载

**症状**：应用启动失败，提示环境变量缺失

**解决方案**：
- 确保 `.env` 文件存在于项目根目录
- 检查 `.env` 文件格式（不要有多余的空格）
- 确保环境变量名称正确
- 重启应用

### 5.7 数据库迁移失败

**症状**：运行迁移时出错

**解决方案**：
- 检查数据库连接是否正常
- 查看迁移文件是否有语法错误
- 如果迁移失败，可以重置数据库（开发环境）：
  ```bash
  npx prisma migrate reset
  ```
- 检查 Prisma schema 是否正确

### 5.8 开发服务器无法启动

**症状**：`npm run dev` 无法启动

**检查清单**：
1. Node.js 版本是否正确（需要 Node.js 20+）
2. 依赖是否已安装：`npm install`
3. TypeScript 是否已安装：`npm install -g typescript`（可选）
4. 端口是否被占用
5. 查看错误日志

---

## 📚 相关文档

- [部署指南](./DEPLOYMENT.md) - 完整的 EC2 部署指南
- [访问指南](./ACCESS_GUIDE.md) - 如何访问和配置服务
- [故障排查](./TROUBLESHOOTING.md) - 详细的故障排查指南
- [微信分享配置](./WECHAT_SHARE_SETUP.md) - 微信分享卡片配置

---

## 🚀 下一步

1. **开发环境**：
   - 完成快速启动后，开始开发新功能
   - 使用 Prisma Studio 查看和管理数据

2. **生产环境**：
   - 参考 [部署指南](./DEPLOYMENT.md) 部署到 EC2
   - 配置域名和 HTTPS
   - 设置监控和备份

3. **功能配置**：
   - 配置 Shopify API
   - 设置管理员账号
   - 配置微信分享（可选）
