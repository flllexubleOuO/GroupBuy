# 微信团购系统

基于 Node.js + Express + Shopify Admin API 的团购订单管理系统，支持微信 H5 下单和后台订单管理。

## 功能特性

- 📱 **H5 下单页面**：适配微信浏览器，支持商品选择、数量调整、付款截图上传
- 🛒 **Shopify 集成**：自动从 Shopify 拉取商品列表，下单后自动创建已付款订单
- 🔐 **后台管理**：订单列表、详情查看、状态管理、打印功能
- 📸 **付款截图**：支持图片上传和查看
- 🚀 **易于部署**：支持 Docker 和传统部署方式

## 技术栈

- **后端**: Node.js + Express.js + TypeScript
- **数据库**: Prisma ORM + SQLite (开发) / PostgreSQL (生产)
- **模板引擎**: EJS
- **前端**: Alpine.js + Tailwind CSS
- **文件上传**: Multer
- **认证**: Express Session

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置 Shopify 凭证和管理员账号：

```env
SHOPIFY_STORE_DOMAIN=rhrw1p-nb.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=your-access-token
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

- 前台下单页面: http://localhost:3000/order
- 后台管理登录: http://localhost:3000/admin/login

## 项目结构

```
├── src/
│   ├── config/          # 配置文件
│   ├── services/        # 业务服务（Shopify API）
│   ├── routes/          # 路由定义
│   ├── controllers/     # 控制器
│   ├── middlewares/     # 中间件（认证、上传）
│   ├── views/           # EJS 模板
│   ├── app.ts           # Express 应用配置
│   └── server.ts        # 服务器启动入口
├── prisma/
│   └── schema.prisma    # 数据库模型
├── public/
│   └── uploads/         # 上传文件存储
└── dist/                # TypeScript 编译输出
```

## 部署到 AWS EC2

### 前置要求

- Ubuntu 20.04+ 或 Amazon Linux 2
- Node.js 20+ (LTS)
- Git
- Nginx
- PM2 (进程管理)
- Docker & Docker Compose (可选，用于 PostgreSQL)

### 步骤 1: 安装依赖

#### 安装 Node.js (使用 nvm)

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# 安装 Node.js LTS
nvm install 20
nvm use 20
```

#### 安装其他工具

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Git
sudo apt install git -y

# 安装 Nginx
sudo apt install nginx -y

# 安装 PM2
npm install -g pm2

# 安装 Docker (可选，用于 PostgreSQL)
sudo apt install docker.io docker-compose -y
sudo systemctl start docker
sudo systemctl enable docker
```

### 步骤 2: 克隆项目

```bash
cd /var/www
sudo git clone <your-repo-url> group-buy-system
cd group-buy-system
sudo chown -R $USER:$USER .
```

### 步骤 3: 配置环境变量

```bash
cp .env.example .env
nano .env
```

配置生产环境变量：

```env
NODE_ENV=production
PORT=3000

# 使用 PostgreSQL (如果使用 Docker)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/groupbuy?schema=public"

# Shopify 配置
SHOPIFY_STORE_DOMAIN=rhrw1p-nb.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=your-token
SHOPIFY_API_VERSION=2024-01

# 管理员账号（请修改）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password

# Session 密钥（请生成随机字符串）
SESSION_SECRET=$(openssl rand -hex 32)
```

### 步骤 4: 安装依赖和初始化数据库

```bash
# 安装依赖
npm install --production

# 生成 Prisma Client
npx prisma generate

# 如果使用 PostgreSQL，先启动数据库
docker-compose up -d db

# 运行数据库迁移
npx prisma migrate deploy
```

### 步骤 5: 构建项目

```bash
npm run build
```

### 步骤 6: 启动应用 (使用 PM2)

```bash
# 启动应用
pm2 start ecosystem.config.js --env production

# 设置开机自启
pm2 startup
pm2 save
```

### 步骤 7: 配置 Nginx 反向代理

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/sites-available/group-buy
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或 IP

    # 上传文件大小限制
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件直接服务
    location /uploads {
        alias /var/www/group-buy-system/public/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/group-buy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤 8: 配置防火墙

```bash
# 允许 HTTP/HTTPS
sudo ufw allow 'Nginx Full'
# 或仅允许 HTTP
sudo ufw allow 'Nginx HTTP'
```

## Docker 部署

### 使用 Docker Compose

1. 配置 `.env` 文件（参考步骤 3）

2. 启动服务：

```bash
docker-compose up -d
```

3. 运行数据库迁移：

```bash
docker-compose exec app npx prisma migrate deploy
```

4. 查看日志：

```bash
docker-compose logs -f app
```

### 仅使用 Dockerfile

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

## 自动化部署

### 使用部署脚本

在 EC2 上执行：

```bash
./deploy.sh
```

### GitHub Actions (可选)

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to EC2

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /var/www/group-buy-system
            ./deploy.sh
```

## 常用命令

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 启动生产服务器
npm start

# 数据库管理
npx prisma studio          # 打开数据库管理界面
npx prisma migrate dev      # 开发环境迁移
npx prisma migrate deploy  # 生产环境迁移

# PM2 管理
pm2 status                 # 查看状态
pm2 logs                   # 查看日志
pm2 restart group-buy-system  # 重启应用
pm2 stop group-buy-system     # 停止应用
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务器端口 | 3000 |
| `DATABASE_URL` | 数据库连接字符串 | `file:./dev.db` |
| `SHOPIFY_STORE_DOMAIN` | Shopify 店铺域名 | - |
| `SHOPIFY_ADMIN_API_ACCESS_TOKEN` | Shopify API Token | - |
| `SHOPIFY_API_VERSION` | Shopify API 版本 | 2024-01 |
| `ADMIN_USERNAME` | 后台管理员用户名 | admin |
| `ADMIN_PASSWORD` | 后台管理员密码 | - |
| `SESSION_SECRET` | Session 加密密钥 | - |
| `UPLOAD_DEST` | 上传文件目录 | `./public/uploads` |
| `UPLOAD_MAX_SIZE` | 上传文件大小限制（字节） | 5242880 (5MB) |

## 注意事项

1. **生产环境安全**：
   - 修改默认管理员密码
   - 使用强随机字符串作为 `SESSION_SECRET`
   - 配置 HTTPS（使用 Let's Encrypt）
   - 定期备份数据库

2. **文件上传**：
   - 确保 `public/uploads` 目录有写权限
   - 定期清理旧的上传文件

3. **数据库**：
   - 开发环境使用 SQLite，生产环境建议使用 PostgreSQL
   - 定期备份数据库

4. **Shopify 订单**：
   - 订单创建失败时，本地订单仍会保存，需要管理员手动处理
   - Shopify 订单 ID 会在创建成功后自动关联

## 故障排查

### 应用无法启动

```bash
# 检查日志
pm2 logs group-buy-system

# 检查端口占用
sudo lsof -i :3000

# 检查环境变量
pm2 env group-buy-system
```

### 数据库连接失败

```bash
# 检查数据库服务
docker-compose ps

# 检查连接字符串
echo $DATABASE_URL

# 测试连接
npx prisma db pull
```

### 文件上传失败

```bash
# 检查目录权限
ls -la public/uploads

# 修复权限
chmod -R 755 public/uploads
```

## 许可证

MIT

## 支持

如有问题，请提交 Issue 或联系开发团队。

