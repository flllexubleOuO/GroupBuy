# 代码同步到生产环境指南

本文档说明如何将代码同步到生产环境（EC2 服务器）。

## 🚀 方式一：使用 GitHub Actions 自动部署（推荐）

这是最简单和推荐的方式，代码会自动同步并部署。

### 步骤 1: 提交并推送代码到 GitHub

```bash
# 1. 查看当前更改
git status

# 2. 添加所有更改（或指定文件）
git add .

# 3. 提交更改
git commit -m "更新代码：描述你的更改"

# 4. 推送到 GitHub
git push origin main
```

### 步骤 2: 在 GitHub 上触发部署

1. 打开 GitHub 仓库页面
2. 点击 **Actions** 标签
3. 在左侧选择 **Deploy to EC2** workflow
4. 点击右侧的 **Run workflow** 按钮
5. 选择分支（通常是 `main`）
6. 点击 **Run workflow** 开始部署

### 步骤 3: 查看部署状态

- 在 Actions 页面可以看到部署进度
- 绿色 ✅ 表示成功，红色 ❌ 表示失败
- 点击运行记录可以查看详细日志

---

## 🔧 方式二：手动使用 rsync 同步（快速测试）

如果需要快速同步代码而不经过 GitHub，可以使用 rsync：

### 前置条件

1. 确保已配置 SSH 密钥，可以无密码登录 EC2
2. 知道 EC2 的 IP 地址和用户名
3. 知道部署路径（默认：`/home/ec2-user/tuangou-project`）

### 同步命令

```bash
# 设置变量（根据实际情况修改）
EC2_HOST="your-ec2-ip-or-domain"
EC2_USER="ec2-user"  # 或 ubuntu（根据系统）
DEPLOY_PATH="/home/ec2-user/tuangou-project"

# 同步代码（排除不需要的文件）
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '*.db' \
  --exclude '*.db-journal' \
  --exclude 'logs' \
  --exclude 'public/uploads' \
  --exclude '.env' \
  --exclude '.DS_Store' \
  ./ ${EC2_USER}@${EC2_HOST}:${DEPLOY_PATH}/

# 在服务器上执行部署脚本
ssh ${EC2_USER}@${EC2_HOST} << EOF
  cd ${DEPLOY_PATH}
  chmod +x deploy.sh
  ./deploy.sh
EOF
```

---

## 📋 方式三：在服务器上使用 Git Pull（如果服务器有 Git 仓库）

如果 EC2 服务器上已经初始化了 Git 仓库：

```bash
# SSH 连接到服务器
ssh ec2-user@your-ec2-ip

# 进入项目目录
cd /home/ec2-user/tuangou-project

# 拉取最新代码
git pull origin main

# 执行部署脚本
chmod +x deploy.sh
./deploy.sh
```

---

## ⚙️ 部署前检查清单

在部署前，请确认：

- [ ] 代码已提交到 Git（如果使用 GitHub Actions）
- [ ] GitHub Secrets 已正确配置（`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`）
- [ ] EC2 服务器可以 SSH 连接
- [ ] 服务器上已安装 Node.js、npm、PM2
- [ ] 服务器上的 `.env` 文件已配置（不会被同步，需要手动维护）

---

## 🔍 验证部署

部署完成后，验证服务是否正常运行：

```bash
# SSH 连接到服务器
ssh ec2-user@your-ec2-ip

# 检查 PM2 进程状态
pm2 status

# 查看应用日志
pm2 logs group-buy-system --lines 50

# 检查应用信息
pm2 info group-buy-system
```

---

## 🐛 常见问题

### 问题 1: GitHub Actions 部署失败

**可能原因**：
- GitHub Secrets 未配置或配置错误
- EC2 服务器无法连接
- SSH 密钥不正确

**解决方案**：
1. 检查 GitHub Secrets 配置（Settings → Secrets and variables → Actions）
2. 检查 EC2 安全组是否允许 SSH（端口 22）
3. 查看 Actions 日志获取详细错误信息

### 问题 2: rsync 同步失败

**可能原因**：
- SSH 连接失败
- 权限问题
- 磁盘空间不足

**解决方案**：
```bash
# 测试 SSH 连接
ssh ec2-user@your-ec2-ip

# 检查磁盘空间
ssh ec2-user@your-ec2-ip "df -h"

# 检查目录权限
ssh ec2-user@your-ec2-ip "ls -la /home/ec2-user/tuangou-project"
```

### 问题 3: 部署后应用无法启动

**可能原因**：
- 环境变量未配置
- 数据库迁移失败
- 依赖安装失败

**解决方案**：
```bash
# 查看部署日志
ssh ec2-user@your-ec2-ip
cd /home/ec2-user/tuangou-project
pm2 logs group-buy-system

# 检查环境变量
cat .env

# 手动执行部署脚本查看错误
./deploy.sh
```

---

## 📝 注意事项

1. **环境变量**：`.env` 文件不会被同步，需要在服务器上手动维护
2. **数据库文件**：`*.db` 文件不会被同步，生产环境数据库独立维护
3. **上传文件**：`public/uploads` 目录不会被同步，保留服务器上的文件
4. **日志文件**：`logs` 目录不会被同步，保留服务器上的日志

---

## 🔗 相关文档

- [完整部署指南](./DEPLOYMENT.md) - 详细的部署配置说明
- [故障排查指南](./TROUBLESHOOTING.md) - 常见问题解决方案
- [访问和连接指南](./ACCESS_GUIDE.md) - 如何访问部署后的服务

