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

### 开发环境

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置 Shopify 凭证和管理员账号

# 3. 初始化数据库
npx prisma generate
npx prisma migrate dev

# 4. 启动开发服务器
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

- 前台下单页面: http://localhost:3000/order
- 后台管理登录: http://localhost:3000/admin/login

详细步骤请参考 [快速开始指南](./QUICKSTART.md)。

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

## 部署

### 部署到 AWS EC2

完整的部署指南请参考 [EC2 部署指南](./DEPLOYMENT.md)，包括：

- GitHub 仓库设置
- EC2 服务器环境设置
- SSH 密钥配置
- GitHub Secrets 配置
- 环境变量配置
- 自动部署配置

### Docker 部署

```bash
# 使用 Docker Compose
docker-compose up -d

# 运行数据库迁移
docker-compose exec app npx prisma migrate deploy
```

详细步骤请参考 [快速开始指南](./QUICKSTART.md#3-docker-部署)。

## 访问服务

部署后访问服务请参考 [访问和连接指南](./ACCESS_GUIDE.md)，包括：

- 快速访问方法
- EC2 安全组配置
- 域名和 HTTPS 配置
- 连接问题排查

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

详细配置说明请参考 [部署指南 - 环境变量配置](./DEPLOYMENT.md#5-环境变量配置)。

## 文档索引

- 📖 [快速开始指南](./QUICKSTART.md) - 快速启动和运行
- 🚀 [部署指南](./DEPLOYMENT.md) - 完整的 EC2 部署指南
- 🌐 [访问和连接指南](./ACCESS_GUIDE.md) - 如何访问和配置服务
- 🐛 [故障排查指南](./TROUBLESHOOTING.md) - 详细的故障排查
- 📱 [微信分享配置](./WECHAT_SHARE_SETUP.md) - 微信分享卡片配置

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

如果遇到问题，请参考：

- [访问和连接指南 - 故障排查](./ACCESS_GUIDE.md#9-故障排查)
- [故障排查指南](./TROUBLESHOOTING.md)

常见问题：

- **应用无法启动**：检查日志 `pm2 logs group-buy-system`
- **数据库连接失败**：检查 `DATABASE_URL` 配置
- **文件上传失败**：检查目录权限
- **无法访问网站**：检查 EC2 安全组配置

## 许可证

MIT

## 支持

如有问题，请提交 Issue 或联系开发团队。
