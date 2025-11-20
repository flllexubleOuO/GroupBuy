# EC2 服务器环境设置指南

本指南将帮助您在 EC2 服务器上设置运行项目所需的环境。

## 📋 前置要求

- EC2 实例已启动并运行
- 可以通过 SSH 连接到服务器
- 具有 sudo 权限

## 🚀 快速安装脚本

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

# 验证安装
node --version
npm --version
pm2 --version
```

## 📝 详细步骤

### 步骤 1: 连接到 EC2

```bash
ssh ec2-user@your-ec2-ip
```

### 步骤 2: 更新系统

```bash
# Amazon Linux 2023
sudo dnf update -y

# 如果是 Ubuntu
# sudo apt update && sudo apt upgrade -y
```

### 步骤 3: 安装 Node.js

#### 方法 A: 使用 NodeSource（推荐）

```bash
# 安装 Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 验证安装
node --version  # 应该显示 v20.x.x
npm --version   # 应该显示 10.x.x
```

#### 方法 B: 使用包管理器

```bash
# Amazon Linux 2023
sudo dnf install -y nodejs npm

# Ubuntu
# sudo apt install -y nodejs npm
```

**注意**：包管理器中的 Node.js 版本可能较旧，建议使用方法 A。

### 步骤 4: 安装 PM2

```bash
# 全局安装 PM2
sudo npm install -g pm2

# 验证安装
pm2 --version

# 设置 PM2 开机自启
pm2 startup
# 按照提示执行输出的命令
```

### 步骤 5: 安装其他工具（可选但推荐）

```bash
# 安装 Git（如果需要手动操作）
sudo dnf install -y git

# 安装构建工具（某些 npm 包可能需要）
sudo dnf groupinstall -y "Development Tools"
```

### 步骤 6: 创建项目目录

```bash
# 创建项目目录
mkdir -p ~/tuangou-project
cd ~/tuangou-project

# 设置权限
chmod 755 ~/tuangou-project
```

### 步骤 7: 配置环境变量

```bash
cd ~/tuangou-project
nano .env
```

添加必要的环境变量（参考项目的环境变量配置）。

## ✅ 验证安装

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

## 🔧 常见问题

### Q1: Node.js 版本太旧

**解决方案**：
```bash
# 卸载旧版本
sudo dnf remove -y nodejs npm

# 安装新版本（使用 NodeSource）
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

### Q2: npm 命令不存在

**解决方案**：
```bash
# Node.js 通常自带 npm，如果没有：
sudo dnf install -y npm
```

### Q3: PM2 安装失败（权限问题）

**解决方案**：
```bash
# 使用 sudo 安装
sudo npm install -g pm2

# 或者配置 npm 全局路径（不推荐）
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g pm2
```

### Q4: 端口被占用

**解决方案**：
```bash
# 检查端口占用
sudo netstat -tulpn | grep :3000

# 或者使用 ss
sudo ss -tulpn | grep :3000

# 如果需要，可以修改应用端口或停止占用端口的服务
```

## 🔒 安全配置

### 1. 配置防火墙

```bash
# 允许 SSH (端口 22)
sudo firewall-cmd --permanent --add-service=ssh

# 允许应用端口 (端口 3000)
sudo firewall-cmd --permanent --add-port=3000/tcp

# 重新加载防火墙
sudo firewall-cmd --reload
```

### 2. 配置 EC2 安全组

在 AWS 控制台中：
1. 进入 EC2 → Security Groups
2. 选择您的安全组
3. 添加入站规则：
   - SSH (端口 22) - 仅允许您的 IP
   - 自定义 TCP (端口 3000) - 允许需要访问的 IP

## 📦 完整安装脚本

将以下脚本保存为 `setup-ec2.sh`，然后在 EC2 上执行：

```bash
#!/bin/bash

set -e

echo "🚀 开始设置 EC2 环境..."

# 更新系统
echo "📦 更新系统..."
sudo dnf update -y

# 安装 Node.js 20.x
echo "📦 安装 Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 安装 PM2
echo "📦 安装 PM2..."
sudo npm install -g pm2

# 安装 Git（可选）
echo "📦 安装 Git..."
sudo dnf install -y git

# 创建项目目录
echo "📁 创建项目目录..."
mkdir -p ~/tuangou-project
cd ~/tuangou-project

# 验证安装
echo "✅ 验证安装..."
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "PM2: $(pm2 --version)"

# 设置 PM2 开机自启
echo "⚙️  配置 PM2 开机自启..."
pm2 startup
echo "请按照上面的提示执行命令"

echo "✅ 环境设置完成！"
```

使用方法：
```bash
# 在 EC2 上执行
chmod +x setup-ec2.sh
./setup-ec2.sh
```

## 🎯 下一步

环境设置完成后：

1. **配置 GitHub Secrets**（如果还没配置）
   - 参考 `GITHUB_SECRETS_SETUP.md`

2. **测试部署**
   - 在 GitHub Actions 中手动触发部署
   - 或推送代码到 main 分支

3. **验证应用运行**
   ```bash
   pm2 status
   pm2 logs group-buy-system
   ```

## 📚 相关文档

- [Node.js 官方文档](https://nodejs.org/)
- [PM2 官方文档](https://pm2.keymetrics.io/)
- [Amazon Linux 2023 文档](https://docs.aws.amazon.com/linux/al2023/)

