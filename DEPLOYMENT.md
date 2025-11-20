# EC2 部署配置指南

本文档说明如何配置 GitHub Actions 自动部署到 EC2 服务器。

## 前置条件

1. **EC2 服务器已设置好**
   - 已安装 Node.js、npm、PM2
   - 已安装 Git
   - 已配置 SSH 访问

2. **GitHub 仓库已创建**
   - 代码已推送到 GitHub

## 步骤 1: 在 EC2 上准备部署环境

### 1.1 创建部署目录

```bash
# SSH 连接到 EC2
ssh ec2-user@your-ec2-ip

# 创建项目目录
mkdir -p /home/ec2-user/tuangou-project
cd /home/ec2-user/tuangou-project

# 初始化 Git 仓库（如果还没有）
git init
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
# 或者使用 SSH
# git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
```

### 1.2 配置环境变量

在 EC2 服务器上创建 `.env` 文件：

```bash
cd /home/ec2-user/tuangou-project
nano .env
```

添加必要的环境变量。**最小配置**（部署脚本会自动创建默认值，但建议手动配置）：

```env
# 应用配置
NODE_ENV=production
PORT=3000

# 数据库配置（SQLite）
DATABASE_URL="file:./prisma/prod.db"

# Shopify 配置（必需）
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=your-access-token
SHOPIFY_API_VERSION=2024-01

# 管理员账号（请修改默认密码）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password

# Session 密钥（生成随机字符串）
# 生成方法: openssl rand -hex 32
SESSION_SECRET=your-random-secret-key
```

**重要提示**：
- `.env` 文件不会被 rsync 同步（已在 workflow 中排除）
- 首次部署后，部署脚本会自动创建默认 `.env` 文件（如果不存在）
- 建议在首次部署前手动创建 `.env` 文件并配置正确的值
- 数据库文件会保存在 `prisma/prod.db`

### 1.3 确保部署脚本可执行

```bash
chmod +x deploy.sh
```

## 步骤 2: 配置 GitHub Secrets

在 GitHub 仓库中配置以下 Secrets：

1. 进入 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**，添加以下 secrets：

### 必需的 Secrets

| Secret 名称 | 说明 | 示例 |
|------------|------|------|
| `EC2_HOST` | EC2 服务器的 IP 地址或域名 | `ec2-xx-xx-xx-xx.compute-1.amazonaws.com` 或 `123.45.67.89` |
| `EC2_USER` | SSH 用户名 | `ec2-user` (Amazon Linux) 或 `ubuntu` (Ubuntu) |
| `EC2_SSH_KEY` | SSH 私钥内容 | 完整的私钥内容（包括 `-----BEGIN RSA PRIVATE KEY-----` 和 `-----END RSA PRIVATE KEY-----`） |
| `EC2_DEPLOY_PATH` | 部署路径（可选） | `/home/ec2-user/tuangou-project` |

### 如何获取 SSH 私钥

如果您使用 AWS EC2：

1. 如果您使用 AWS 密钥对：
   ```bash
   # 下载的 .pem 文件内容就是私钥
   cat ~/Downloads/your-key.pem
   ```

2. 如果您使用自己的 SSH 密钥：
   ```bash
   # 查看私钥内容
   cat ~/.ssh/id_rsa
   ```

**重要提示**：
- 私钥内容必须完整，包括头尾的标记行
- 不要泄露私钥，只在 GitHub Secrets 中配置
- 确保私钥对应的公钥已添加到 EC2 服务器的 `~/.ssh/authorized_keys`

## 步骤 3: 测试部署

### 3.1 手动触发部署

1. 在 GitHub 仓库中，点击 **Actions** 标签
2. 选择 **Deploy to EC2** workflow
3. 点击 **Run workflow** 按钮
4. 选择分支（通常是 `main`）
5. 点击 **Run workflow**

### 3.2 自动触发部署

当您推送代码到 `main` 分支时，部署会自动触发：

```bash
git add .
git commit -m "更新代码"
git push origin main
```

## 步骤 4: 验证部署

部署完成后，检查：

1. **查看 GitHub Actions 日志**
   - 在 Actions 标签页查看部署状态
   - 如果有错误，查看详细日志

2. **在 EC2 上验证**
   ```bash
   ssh ec2-user@your-ec2-ip
   cd /home/ec2-user/tuangou-project
   pm2 status
   pm2 logs group-buy-system
   ```

3. **访问应用**
   - 检查应用是否正常运行
   - 访问 `http://your-ec2-ip:3000`

## 故障排查

### 问题 1: SSH 连接失败

**症状**: `Permission denied (publickey)`

**解决方案**:
- 检查 `EC2_SSH_KEY` 是否正确配置
- 确保私钥格式正确（包括头尾标记）
- 检查 EC2 安全组是否允许 SSH 访问（端口 22）

### 问题 2: 部署脚本执行失败

**症状**: 部署过程中某个步骤失败

**解决方案**:
- 检查 EC2 上是否安装了所有必需的软件（Node.js, npm, PM2, Git）
- 检查 `.env` 文件是否配置正确
- 查看 GitHub Actions 日志获取详细错误信息
- 手动 SSH 到服务器执行 `deploy.sh` 查看错误

### 问题 3: 应用无法启动

**症状**: 部署成功但应用无法访问

**解决方案**:
- 检查 PM2 进程状态: `pm2 status`
- 查看 PM2 日志: `pm2 logs group-buy-system`
- 检查端口是否开放（EC2 安全组）
- 检查环境变量是否正确

### 问题 4: rsync 同步失败

**症状**: 代码同步到服务器失败

**解决方案**:
- 确保部署路径存在且有写权限
- 检查磁盘空间: `df -h`
- 检查文件权限

## 安全建议

1. **使用 IAM 角色**（推荐）
   - 为 EC2 实例配置 IAM 角色，而不是使用访问密钥

2. **限制 SSH 访问**
   - 在安全组中只允许特定 IP 访问 SSH 端口

3. **定期更新**
   - 定期更新系统和依赖包

4. **监控日志**
   - 定期检查应用日志和系统日志

5. **备份**
   - 定期备份数据库和重要文件

## 高级配置

### 使用 Docker 部署

如果您想使用 Docker 部署，可以修改 workflow 文件，使用 `docker-compose` 而不是 PM2。

### 多环境部署

可以创建多个 workflow 文件，分别用于 staging 和 production 环境。

### 部署前测试

在部署前可以添加测试步骤，确保代码质量。

## 相关文件

- `.github/workflows/deploy.yml` - GitHub Actions 工作流配置
- `deploy.sh` - 部署脚本
- `ecosystem.config.js` - PM2 配置文件
- `docker-compose.yml` - Docker Compose 配置（可选）

