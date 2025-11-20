# EC2 部署完整指南

本文档提供从零开始部署到 EC2 服务器的完整指南，包括环境设置、GitHub 配置、自动部署等所有步骤。

## 📋 目录

1. [GitHub 仓库设置](#1-github-仓库设置)
2. [EC2 服务器环境设置](#2-ec2-服务器环境设置)
3. [SSH 密钥配置](#3-ssh-密钥配置)
4. [GitHub Secrets 配置](#4-github-secrets-配置)
5. [环境变量配置](#5-环境变量配置)
6. [自动部署配置](#6-自动部署配置)
7. [验证部署](#7-验证部署)
8. [故障排查](#8-故障排查)

---

## 1. GitHub 仓库设置

### 步骤 1: 在 GitHub 上创建新仓库

1. 登录 GitHub 账号
2. 点击右上角的 "+" 号，选择 "New repository"
3. 填写仓库信息：
   - **Repository name**: `tuangou-project` (或您喜欢的名称)
   - **Description**: `WeChat Group Buying System with Shopify Integration`
   - **Visibility**: 选择 Public 或 Private
   - **不要**勾选 "Initialize this repository with a README"（因为我们已经有了）
4. 点击 "Create repository"

### 步骤 2: 连接本地仓库到 GitHub

在终端中执行以下命令（将 `YOUR_USERNAME` 和 `YOUR_REPO_NAME` 替换为您的实际信息）：

```bash
# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 或者使用 SSH（如果您配置了 SSH key）
# git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git

# 查看远程仓库配置
git remote -v
```

### 步骤 3: 推送代码到 GitHub

```bash
# 推送主分支到 GitHub
git branch -M main
git push -u origin main
```

如果遇到认证问题，您可能需要：
- 使用 Personal Access Token（推荐）
- 或配置 SSH key

### 创建 Personal Access Token（如果需要）

如果使用 HTTPS 推送时遇到认证问题：

1. 访问 GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 点击 "Generate new token (classic)"
3. 设置权限：至少勾选 `repo` 权限
4. 生成后复制 token
5. 推送时使用 token 作为密码

### 注意事项

1. **敏感信息**: `.env` 文件已被 `.gitignore` 忽略，不会上传到 GitHub
2. **数据库文件**: `*.db` 文件已被忽略
3. **上传文件**: `public/uploads/*` 已被忽略
4. **依赖包**: `node_modules/` 已被忽略

---

## 2. EC2 服务器环境设置

### 前置要求

- EC2 实例已启动并运行
- 可以通过 SSH 连接到服务器
- 具有 sudo 权限

### 快速安装脚本

在 EC2 服务器上执行以下命令（适用于 Amazon Linux 2023）：

```bash
#!/bin/bash

# 更新系统
sudo dnf update -y

# 安装 Node.js 20.x (LTS)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 安装 PM2 (进程管理器)
sudo npm install -g pm2

# 安装 Git
sudo dnf install -y git

# 验证安装
node --version
npm --version
pm2 --version
```

### 详细步骤

#### 步骤 1: 连接到 EC2

```bash
ssh ec2-user@your-ec2-ip
```

#### 步骤 2: 更新系统

```bash
# Amazon Linux 2023
sudo dnf update -y

# 如果是 Ubuntu
# sudo apt update && sudo apt upgrade -y
```

#### 步骤 3: 安装 Node.js

**方法 A: 使用 NodeSource（推荐）**

```bash
# 安装 Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 验证安装
node --version  # 应该显示 v20.x.x
npm --version   # 应该显示 10.x.x
```

**方法 B: 使用包管理器**

```bash
# Amazon Linux 2023
sudo dnf install -y nodejs npm

# Ubuntu
# sudo apt install -y nodejs npm
```

**注意**：包管理器中的 Node.js 版本可能较旧，建议使用方法 A。

#### 步骤 4: 安装 PM2

```bash
# 全局安装 PM2
sudo npm install -g pm2

# 验证安装
pm2 --version

# 设置 PM2 开机自启
pm2 startup
# 按照提示执行输出的命令
```

#### 步骤 5: 安装其他工具（可选但推荐）

```bash
# 安装 Git（如果需要手动操作）
sudo dnf install -y git

# 安装构建工具（某些 npm 包可能需要）
sudo dnf groupinstall -y "Development Tools"
```

#### 步骤 6: 创建项目目录

```bash
# 创建项目目录
mkdir -p ~/tuangou-project
cd ~/tuangou-project

# 设置权限
chmod 755 ~/tuangou-project
```

### 验证安装

执行以下命令验证所有软件都已正确安装：

```bash
# 检查 Node.js
node --version
# 应该显示: v20.x.x 或更高

# 检查 npm
npm --version
# 应该显示: 10.x.x 或更高

# 检查 PM2
pm2 --version
# 应该显示版本号

# 检查 npx
npx --version
# 应该显示版本号
```

### 常见问题

#### Q1: Node.js 版本太旧

**解决方案**：
```bash
# 卸载旧版本
sudo dnf remove -y nodejs npm

# 安装新版本（使用 NodeSource）
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

#### Q2: npm 命令不存在

**解决方案**：
```bash
# Node.js 通常自带 npm，如果没有：
sudo dnf install -y npm
```

#### Q3: PM2 安装失败（权限问题）

**解决方案**：
```bash
# 使用 sudo 安装
sudo npm install -g pm2
```

---

## 3. SSH 密钥配置

如果您没有 SSH 密钥，本指南将帮助您生成新的密钥对并配置到 EC2 和 GitHub。

### 步骤 1: 生成新的 SSH 密钥对

在终端中执行以下命令：

```bash
# 生成新的 SSH 密钥对
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy"

# 按提示操作：
# 1. 保存位置：直接按回车使用默认位置 (~/.ssh/id_rsa)
# 2. 密码：可以设置密码（推荐）或直接回车跳过
```

**说明**：
- `-t rsa`：使用 RSA 算法
- `-b 4096`：密钥长度为 4096 位（更安全）
- `-C "github-actions-deploy"`：添加注释（可以改为您的邮箱）

### 步骤 2: 查看生成的密钥

生成后，您会得到两个文件：
- **私钥**：`~/.ssh/id_rsa`（用于 GitHub Secrets）
- **公钥**：`~/.ssh/id_rsa.pub`（需要添加到 EC2 服务器）

查看私钥内容（用于配置 GitHub Secrets）：
```bash
cat ~/.ssh/id_rsa
```

查看公钥内容（用于添加到 EC2）：
```bash
cat ~/.ssh/id_rsa.pub
```

### 步骤 3: 将公钥添加到 EC2 服务器

**方法 A: 使用 ssh-copy-id（推荐，最简单）**

```bash
# 替换为您的 EC2 信息
ssh-copy-id -i ~/.ssh/id_rsa.pub ec2-user@your-ec2-ip

# 如果是 Ubuntu 系统
# ssh-copy-id -i ~/.ssh/id_rsa.pub ubuntu@your-ec2-ip
```

**方法 B: 手动添加（如果方法 A 不工作）**

1. **复制公钥内容**：
   ```bash
   cat ~/.ssh/id_rsa.pub
   ```
   复制输出的全部内容

2. **SSH 连接到 EC2**（使用您现有的方式，比如 AWS 控制台的连接）：
   ```bash
   ssh ec2-user@your-ec2-ip
   ```

3. **在 EC2 服务器上执行**：
   ```bash
   # 创建 .ssh 目录（如果不存在）
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   
   # 将公钥添加到 authorized_keys
   echo "您的公钥内容" >> ~/.ssh/authorized_keys
   
   # 设置正确的权限
   chmod 600 ~/.ssh/authorized_keys
   ```

**方法 C: 使用 AWS Systems Manager（如果无法直接 SSH）**

如果您无法直接 SSH 连接，可以使用 AWS Systems Manager：

1. 在 AWS 控制台打开 **Systems Manager** → **Session Manager**
2. 连接到您的 EC2 实例
3. 执行上述方法 B 的步骤 3

### 步骤 4: 测试 SSH 连接

```bash
# 测试是否可以无密码连接
ssh ec2-user@your-ec2-ip

# 如果成功，您应该能够直接登录，不需要输入密码
```

### 常见问题

#### Q1: ssh-copy-id 命令不存在

**解决方案**：手动添加公钥（使用方法 B）

#### Q2: 提示 "Permission denied"

**可能原因**：
- 公钥未正确添加到服务器
- 文件权限不正确

**解决方案**：
```bash
# 在 EC2 服务器上检查权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

#### Q3: 仍然需要输入密码

**解决方案**：
- 确保公钥已正确添加到 `~/.ssh/authorized_keys`
- 检查文件权限（必须是 600）
- 检查 SSH 配置：`cat ~/.ssh/config`

### 安全提示

1. **保护私钥**：
   - 永远不要分享私钥
   - 不要将私钥提交到代码仓库
   - 私钥文件权限应该是 600：`chmod 600 ~/.ssh/id_rsa`

2. **使用密码保护**：
   - 生成密钥时设置密码更安全
   - 但 GitHub Actions 使用私钥时无法输入密码，所以如果用于 CI/CD，建议不设置密码

3. **定期轮换**：
   - 定期更换 SSH 密钥
   - 删除不再使用的密钥

---

## 4. GitHub Secrets 配置

本指南将详细说明如何在 GitHub 仓库中配置 Secrets，以便 GitHub Actions 能够自动部署到 EC2 服务器。

### 需要配置的 Secrets 列表

| Secret 名称 | 是否必需 | 说明 | 示例值 |
|------------|---------|------|--------|
| `EC2_HOST` | ✅ 必需 | EC2 服务器的 IP 地址或域名 | `ec2-54-123-45-67.compute-1.amazonaws.com` 或 `54.123.45.67` |
| `EC2_USER` | ✅ 必需 | SSH 登录用户名 | `ec2-user` (Amazon Linux) 或 `ubuntu` (Ubuntu) |
| `EC2_SSH_KEY` | ✅ 必需 | SSH 私钥的完整内容 | 见下方说明 |
| `EC2_DEPLOY_PATH` | ⚠️ 可选 | 项目在服务器上的部署路径 | `/home/ec2-user/tuangou-project` |

### 配置步骤

#### 步骤 1: 进入 GitHub 仓库设置

1. 打开您的 GitHub 仓库页面
2. 点击仓库顶部的 **Settings**（设置）标签
3. 在左侧菜单中找到 **Secrets and variables** → **Actions**
4. 点击进入

#### 步骤 2: 添加第一个 Secret - EC2_HOST

1. 点击 **New repository secret** 按钮
2. 在 **Name** 字段输入：`EC2_HOST`
3. 在 **Secret** 字段输入您的 EC2 服务器地址：
   - 可以是 IP 地址：`54.123.45.67`
   - 也可以是域名：`ec2-54-123-45-67.compute-1.amazonaws.com`
4. 点击 **Add secret** 保存

**如何获取 EC2_HOST？**
- 在 AWS EC2 控制台的实例详情中查看 **Public IPv4 address** 或 **Public IPv4 DNS**

#### 步骤 3: 添加第二个 Secret - EC2_USER

1. 再次点击 **New repository secret** 按钮
2. 在 **Name** 字段输入：`EC2_USER`
3. 在 **Secret** 字段输入 SSH 用户名：
   - Amazon Linux: `ec2-user`
   - Ubuntu: `ubuntu`
   - CentOS: `centos`
   - 其他 Linux: 通常是 `ec2-user` 或 `ubuntu`
4. 点击 **Add secret** 保存

**如何确定 EC2_USER？**
- 在创建 EC2 实例时，AWS 会提示默认用户名
- 或者查看 AWS 文档：https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connection-prereqs.html

#### 步骤 4: 添加第三个 Secret - EC2_SSH_KEY（最重要）

这是最关键的配置，需要 SSH 私钥的完整内容。

**获取 SSH 私钥**：

**情况 A: 使用 AWS 密钥对（.pem 文件）**

如果您在创建 EC2 实例时下载了 `.pem` 文件：

```bash
# 在本地终端执行（Mac/Linux）
cat ~/Downloads/your-key-name.pem

# 或者如果文件在其他位置
cat /path/to/your-key.pem
```

**情况 B: 使用现有的 SSH 密钥**

如果您已经有 SSH 密钥对：

```bash
# 查看私钥内容
cat ~/.ssh/id_rsa

# 或者如果使用其他名称
cat ~/.ssh/id_ed25519
```

**情况 C: 生成新的 SSH 密钥对**

如果您还没有 SSH 密钥，参考 [SSH 密钥配置](#3-ssh-密钥配置) 章节。

**复制私钥内容**：

私钥内容应该类似这样：

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdefghijklmnopqrstuvwxyz...
（多行内容）
...
-----END RSA PRIVATE KEY-----
```

**重要提示**：
- ✅ 必须包含 `-----BEGIN RSA PRIVATE KEY-----` 开头
- ✅ 必须包含 `-----END RSA PRIVATE KEY-----` 结尾
- ✅ 复制所有行，包括空行
- ❌ 不要修改任何内容
- ❌ 不要添加额外的空格或换行

**在 GitHub 中添加 EC2_SSH_KEY**：

1. 点击 **New repository secret** 按钮
2. 在 **Name** 字段输入：`EC2_SSH_KEY`
3. 在 **Secret** 字段粘贴完整的私钥内容（包括头尾标记）
4. 点击 **Add secret** 保存

#### 步骤 5: 添加第四个 Secret - EC2_DEPLOY_PATH（可选）

如果您想使用默认路径 `/home/ec2-user/tuangou-project`，可以跳过此步骤。

如果需要自定义部署路径：

1. 点击 **New repository secret** 按钮
2. 在 **Name** 字段输入：`EC2_DEPLOY_PATH`
3. 在 **Secret** 字段输入部署路径，例如：
   - `/home/ec2-user/tuangou-project`
   - `/var/www/tuangou-project`
   - `/opt/apps/tuangou-project`
4. 点击 **Add secret** 保存

### 验证配置

配置完成后，您应该看到以下 Secrets：

```
EC2_HOST          ✅
EC2_USER          ✅
EC2_SSH_KEY       ✅
EC2_DEPLOY_PATH   ⚠️ (可选)
```

### 测试配置

#### 方法 1: 手动触发部署

1. 在 GitHub 仓库中，点击 **Actions** 标签
2. 选择 **Deploy to EC2** workflow
3. 点击 **Run workflow** 按钮
4. 选择分支（通常是 `main`）
5. 点击 **Run workflow**

#### 方法 2: 推送代码触发

```bash
# 在本地终端执行
git add .
git commit -m "测试自动部署"
git push origin main
```

#### 查看部署日志

1. 在 **Actions** 标签页中，点击最新的 workflow 运行
2. 查看每个步骤的日志
3. 如果出现错误，检查：
   - Secrets 是否正确配置
   - EC2 服务器是否可以访问
   - SSH 密钥是否正确

### 常见问题

#### Q1: 提示 "Permission denied (publickey)"

**原因**：SSH 私钥配置不正确或公钥未添加到服务器

**解决方案**：
1. 检查 `EC2_SSH_KEY` 是否包含完整的私钥（包括头尾标记）
2. 确保私钥格式正确，没有多余的空格
3. 将对应的公钥添加到 EC2 服务器：
   ```bash
   # 在本地执行
   ssh-copy-id -i ~/.ssh/id_rsa.pub ec2-user@your-ec2-ip
   ```

#### Q2: 提示 "Host key verification failed"

**原因**：服务器指纹验证失败

**解决方案**：
- 这通常不是问题，workflow 中已配置跳过主机验证
- 如果仍有问题，检查 `EC2_HOST` 是否正确

#### Q3: 提示 "Connection refused" 或 "Connection timed out"

**原因**：无法连接到 EC2 服务器

**解决方案**：
1. 检查 `EC2_HOST` 是否正确
2. 检查 EC2 安全组是否允许 SSH（端口 22）访问
3. 检查 EC2 实例是否正在运行
4. 检查网络连接

#### Q4: 如何更新 Secret？

1. 进入 **Settings** → **Secrets and variables** → **Actions**
2. 找到要更新的 Secret
3. 点击右侧的 **Update** 按钮
4. 修改值后保存

#### Q5: 如何删除 Secret？

1. 进入 **Settings** → **Secrets and variables** → **Actions**
2. 找到要删除的 Secret
3. 点击右侧的 **Delete** 按钮
4. 确认删除

### 快速检查清单

在开始部署前，请确认：

- [ ] `EC2_HOST` 已配置，值为正确的服务器地址
- [ ] `EC2_USER` 已配置，值为正确的用户名
- [ ] `EC2_SSH_KEY` 已配置，包含完整的私钥内容
- [ ] `EC2_DEPLOY_PATH` 已配置（或使用默认值）
- [ ] EC2 服务器可以 SSH 连接
- [ ] EC2 安全组允许 SSH 访问（端口 22）
- [ ] 服务器上已安装 Node.js、npm、PM2、Git
- [ ] 服务器上已创建部署目录

### 安全注意事项

1. **永远不要**将私钥提交到代码仓库
2. **永远不要**在公开场合分享私钥
3. 定期轮换 SSH 密钥
4. 使用最小权限原则配置 EC2 安全组
5. 考虑使用 IAM 角色而不是访问密钥

---

## 5. 环境变量配置

本指南说明如何在 EC2 服务器上配置环境变量。

### 必需的环境变量

#### 最小配置

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

### 详细说明

#### 1. DATABASE_URL

**SQLite 数据库路径**（推荐用于简单部署）：

```env
DATABASE_URL="file:./prisma/prod.db"
```

数据库文件会保存在 `prisma/prod.db`。确保 `prisma` 目录存在且有写权限。

**PostgreSQL 数据库**（如果需要）：

```env
DATABASE_URL="postgresql://username:password@localhost:5432/dbname?schema=public"
```

#### 2. Shopify 配置

获取 Shopify Admin API Access Token：

1. 登录 Shopify 管理后台
2. 进入 **Settings** → **Apps and sales channels** → **Develop apps**
3. 创建新应用或使用现有应用
4. 配置 Admin API scopes（需要 `read_products`, `write_orders` 等权限）
5. 安装应用并获取 Access Token

#### 3. Session Secret

生成安全的随机密钥：

```bash
# 在 EC2 服务器上执行
openssl rand -hex 32
```

将生成的字符串作为 `SESSION_SECRET` 的值。

#### 4. 管理员密码

**请务必修改默认密码**！使用强密码：

```env
ADMIN_PASSWORD=your-very-strong-password-here
```

### 首次部署时的配置

#### 方法 1: 手动创建（推荐）

在首次部署前，SSH 连接到 EC2 并创建 `.env` 文件：

```bash
ssh ec2-user@your-ec2-ip
cd /home/ec2-user/tuangou-project
nano .env
# 粘贴配置内容
```

#### 方法 2: 自动创建（使用默认值）

如果 `.env` 文件不存在，部署脚本会自动创建包含默认值的文件：

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="file:./prisma/prod.db"
```

**注意**：自动创建的文件只包含基本配置，您需要手动添加 Shopify 配置和其他敏感信息。

### 验证配置

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

### 安全注意事项

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

### 常见问题

#### Q1: 部署时提示 "Environment variable not found: DATABASE_URL"

**原因**：`.env` 文件不存在或未正确配置

**解决方案**：
1. 检查 `.env` 文件是否存在
2. 确保 `DATABASE_URL` 在文件中
3. 检查文件格式（不要有多余的空格）

#### Q2: 数据库文件权限错误

**解决方案**：
```bash
# 确保 prisma 目录存在且有写权限
mkdir -p prisma
chmod 755 prisma
```

#### Q3: 如何更新环境变量？

**解决方案**：
1. SSH 连接到 EC2
2. 编辑 `.env` 文件：`nano .env`
3. 修改相应的值
4. 重启应用：`pm2 restart group-buy-system`

#### Q4: 如何备份环境变量？

**解决方案**：
```bash
# 备份 .env 文件（不要提交到 Git）
cp .env .env.backup
```

### 完整配置示例

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

---

## 6. 自动部署配置

### 在 EC2 上准备部署环境

#### 创建部署目录

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

#### 确保部署脚本可执行

```bash
chmod +x deploy.sh
```

### 测试部署

#### 手动触发部署

1. 在 GitHub 仓库中，点击 **Actions** 标签
2. 选择 **Deploy to EC2** workflow
3. 点击 **Run workflow** 按钮
4. 选择分支（通常是 `main`）
5. 点击 **Run workflow**

#### 自动触发部署

当您推送代码到 `main` 分支时，部署会自动触发：

```bash
git add .
git commit -m "更新代码"
git push origin main
```

---

## 7. 验证部署

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

---

## 8. 故障排查

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

### 问题 5: 环境变量未加载

**症状**: 应用启动失败，提示环境变量缺失

**解决方案**:
- 检查 `.env` 文件是否存在
- 检查 `.env` 文件格式是否正确
- 确保环境变量名称正确
- 重启应用: `pm2 restart group-buy-system`

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
