# EC2 实例迁移指南

本指南将帮助您将服务从旧的 EC2 实例迁移到新的 EC2 实例。

## 📋 迁移概述

迁移到新 EC2 实例的步骤与初始部署基本相同，主要需要：
1. 在新 EC2 实例上准备环境
2. 更新 GitHub Secrets 配置
3. 迁移数据和配置
4. 验证部署

## ✅ 之前的部署步骤是否还可以使用？

**答案：是的，完全可以使用！**

之前的部署步骤和脚本都是通用的，适用于任何 EC2 实例。您只需要：
- 更新 GitHub Secrets 中的服务器信息（IP、用户名、SSH密钥）
- 在新服务器上执行相同的环境准备步骤

## 🚀 迁移步骤

### 步骤 1: 准备新的 EC2 实例

#### 1.1 安装必要的软件

在新 EC2 实例上执行以下命令（参考 `DEPLOYMENT.md` 第 2 节）：

```bash
# 更新系统
sudo dnf update -y  # Amazon Linux 2023
# 或
# sudo apt update && sudo apt upgrade -y  # Ubuntu

# 安装 Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Git
sudo dnf install -y git

# 验证安装
node --version
npm --version
pm2 --version
```

#### 1.2 创建项目目录

```bash
mkdir -p ~/tuangou-project
cd ~/tuangou-project
chmod 755 ~/tuangou-project
```

### 步骤 2: 配置 SSH 密钥

#### 2.1 获取新 EC2 实例的 SSH 密钥

**情况 A: 使用 AWS 密钥对（.pem 文件）**

如果您在创建新 EC2 实例时使用了新的密钥对：

```bash
# 查看私钥内容（用于 GitHub Secrets）
cat ~/Downloads/new-key-name.pem
```

**情况 B: 使用现有密钥对**

如果新实例使用与旧实例相同的密钥对，可以继续使用旧的 `EC2_SSH_KEY`。

**情况 C: 生成新的 SSH 密钥对**

如果需要为新的 EC2 实例生成新的密钥对：

```bash
# 生成新的 SSH 密钥对
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy-new"

# 查看私钥（用于 GitHub Secrets）
cat ~/.ssh/id_rsa

# 查看公钥（需要添加到新 EC2 服务器）
cat ~/.ssh/id_rsa.pub
```

#### 2.2 将公钥添加到新 EC2 服务器

```bash
# 使用 ssh-copy-id（推荐）
ssh-copy-id -i ~/.ssh/id_rsa.pub ec2-user@new-ec2-ip

# 或手动添加
ssh ec2-user@new-ec2-ip
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "您的公钥内容" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

#### 2.3 测试 SSH 连接

```bash
ssh ec2-user@new-ec2-ip
# 应该能够无密码登录
```

### 步骤 3: 更新 GitHub Secrets

这是迁移的关键步骤。您需要更新 GitHub 仓库中的 Secrets 配置。

#### 3.1 进入 GitHub Secrets 设置

1. 打开您的 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**

#### 3.2 更新或添加 Secrets

需要更新以下 Secrets：

| Secret 名称 | 操作 | 说明 |
|------------|------|------|
| `EC2_HOST` | **更新** | 新 EC2 实例的 IP 地址或域名 |
| `EC2_USER` | **检查/更新** | 新实例的用户名（通常是 `ec2-user` 或 `ubuntu`） |
| `EC2_SSH_KEY` | **检查/更新** | 如果使用新密钥对，需要更新私钥内容 |
| `EC2_DEPLOY_PATH` | **可选** | 部署路径（如果与旧实例不同） |

**更新方法**：

1. 找到要更新的 Secret
2. 点击右侧的 **Update** 按钮
3. 输入新的值
4. 点击 **Update secret** 保存

**示例：更新 EC2_HOST**

- 旧值：`54.123.45.67`（旧实例 IP）
- 新值：`54.234.56.78`（新实例 IP）

**示例：更新 EC2_SSH_KEY**

如果新实例使用不同的密钥对：

1. 复制新私钥的完整内容（包括 `-----BEGIN RSA PRIVATE KEY-----` 和 `-----END RSA PRIVATE KEY-----`）
2. 更新 `EC2_SSH_KEY` Secret

### 步骤 4: 迁移数据和配置

#### 4.1 迁移数据库（如果使用 SQLite）

如果旧实例使用 SQLite 数据库，需要迁移数据：

```bash
# 在旧实例上
ssh ec2-user@old-ec2-ip
cd ~/tuangou-project
# 备份数据库
cp prisma/prod.db prisma/prod.db.backup

# 下载数据库文件到本地
scp ec2-user@old-ec2-ip:~/tuangou-project/prisma/prod.db ./prod.db

# 上传到新实例
scp ./prod.db ec2-user@new-ec2-ip:~/tuangou-project/prisma/prod.db
```

#### 4.2 迁移环境变量配置

```bash
# 在旧实例上查看 .env 文件
ssh ec2-user@old-ec2-ip
cat ~/tuangou-project/.env

# 复制配置内容，然后在新实例上创建
ssh ec2-user@new-ec2-ip
cd ~/tuangou-project
nano .env
# 粘贴配置内容
```

#### 4.3 迁移上传的文件（如果需要）

```bash
# 在旧实例上打包上传文件
ssh ec2-user@old-ec2-ip
cd ~/tuangou-project
tar -czf uploads.tar.gz public/uploads/

# 下载到本地
scp ec2-user@old-ec2-ip:~/tuangou-project/uploads.tar.gz ./

# 上传到新实例
scp ./uploads.tar.gz ec2-user@new-ec2-ip:~/tuangou-project/

# 在新实例上解压
ssh ec2-user@new-ec2-ip
cd ~/tuangou-project
tar -xzf uploads.tar.gz
rm uploads.tar.gz
```

### 步骤 5: 执行首次部署

#### 5.1 手动触发部署

1. 在 GitHub 仓库中，点击 **Actions** 标签
2. 选择 **Deploy to EC2** workflow
3. 点击 **Run workflow** 按钮
4. 选择分支（通常是 `main`）
5. 点击 **Run workflow**

#### 5.2 或推送代码触发

```bash
# 在本地执行
git add .
git commit -m "迁移到新 EC2 实例"
git push origin main
```

### 步骤 6: 验证部署

#### 6.1 检查 GitHub Actions 日志

1. 在 **Actions** 标签页查看部署状态
2. 确认所有步骤都成功完成

#### 6.2 在服务器上验证

```bash
# SSH 连接到新实例
ssh ec2-user@new-ec2-ip
cd ~/tuangou-project

# 检查 PM2 进程
pm2 status

# 查看日志
pm2 logs group-buy-system

# 检查应用信息
pm2 info group-buy-system
```

#### 6.3 访问应用

- 访问 `http://new-ec2-ip:3000`
- 测试主要功能是否正常

### 步骤 7: 更新 DNS/域名（如果使用）

如果您的应用使用域名访问，需要更新 DNS 记录：

1. 登录您的 DNS 提供商（如 Route 53、Cloudflare 等）
2. 更新 A 记录，将域名指向新 EC2 实例的 IP 地址
3. 等待 DNS 传播（通常几分钟到几小时）

### 步骤 8: 清理旧实例（可选）

确认新实例运行正常后，可以：

1. 停止旧 EC2 实例（保留一段时间以便回滚）
2. 或完全终止旧实例（注意：此操作不可逆）

## 🔄 支持多环境部署（可选）

如果您想同时保留两个服务器（例如：一个用于生产，一个用于测试），可以创建多个 workflow 文件。

### 方案 A: 使用不同的 Secrets 名称

创建两个 workflow 文件：

1. `.github/workflows/deploy-production.yml` - 部署到生产环境
2. `.github/workflows/deploy-staging.yml` - 部署到测试环境

每个 workflow 使用不同的 Secrets：

**生产环境 Secrets**：
- `EC2_HOST_PROD`
- `EC2_USER_PROD`
- `EC2_SSH_KEY_PROD`

**测试环境 Secrets**：
- `EC2_HOST_STAGING`
- `EC2_USER_STAGING`
- `EC2_SSH_KEY_STAGING`

### 方案 B: 使用环境变量

在 workflow 中使用 `environment` 功能，为不同环境配置不同的 Secrets。

## 📝 迁移检查清单

在开始迁移前，请确认：

- [ ] 新 EC2 实例已创建并运行
- [ ] 新 EC2 实例已安装 Node.js、npm、PM2、Git
- [ ] 新 EC2 实例的 SSH 密钥已配置
- [ ] 可以 SSH 无密码连接到新实例
- [ ] GitHub Secrets 已更新为新实例的信息
- [ ] 已备份旧实例的数据（数据库、配置文件等）
- [ ] 已准备好迁移数据（如果需要）
- [ ] EC2 安全组已配置（允许 SSH 和 HTTP 访问）

## ⚠️ 注意事项

1. **数据备份**：在迁移前，务必备份旧实例的所有重要数据
2. **停机时间**：如果只有一个实例，迁移过程中会有短暂的服务中断
3. **DNS 传播**：如果使用域名，DNS 更新可能需要一些时间
4. **测试验证**：迁移后，务必全面测试应用功能
5. **回滚计划**：保留旧实例一段时间，以便在出现问题时快速回滚

## 🆘 常见问题

### Q1: 迁移后应用无法启动

**解决方案**：
- 检查 `.env` 文件是否正确配置
- 检查 PM2 日志：`pm2 logs group-buy-system`
- 检查端口是否被占用：`netstat -tulpn | grep 3000`
- 检查 EC2 安全组是否允许端口 3000 的访问

### Q2: 数据库迁移后数据丢失

**解决方案**：
- 检查数据库文件权限：`ls -la prisma/prod.db`
- 检查数据库文件是否在正确位置
- 从备份恢复数据库

### Q3: GitHub Actions 部署失败

**解决方案**：
- 检查 Secrets 是否正确更新
- 检查 SSH 连接是否正常
- 查看 GitHub Actions 日志获取详细错误信息

### Q4: 如何同时部署到两个服务器？

参考上面的"支持多环境部署"章节，创建多个 workflow 文件。

## 📚 相关文档

- `DEPLOYMENT.md` - 完整的部署指南
- `GITHUB_SECRETS_SETUP.md` - GitHub Secrets 配置指南
- `SSH_KEY_SETUP.md` - SSH 密钥配置指南
- `.github/workflows/deploy.yml` - GitHub Actions 工作流配置

## 🎉 迁移完成

迁移完成后，您应该：
1. 新实例正常运行
2. 所有功能正常
3. 数据已成功迁移
4. 域名已更新（如果使用）
5. 旧实例已清理或停止（可选）

如有任何问题，请参考 `TROUBLESHOOTING.md` 进行故障排查。

