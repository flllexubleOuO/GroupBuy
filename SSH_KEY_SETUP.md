# SSH 密钥生成和配置指南

如果您没有 SSH 密钥，本指南将帮助您生成新的密钥对并配置到 EC2 和 GitHub。

## 🔑 步骤 1: 生成新的 SSH 密钥对

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

## 📋 步骤 2: 查看生成的密钥

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

## 🚀 步骤 3: 将公钥添加到 EC2 服务器

### 方法 A: 使用 ssh-copy-id（推荐，最简单）

```bash
# 替换为您的 EC2 信息
ssh-copy-id -i ~/.ssh/id_rsa.pub ec2-user@your-ec2-ip

# 如果是 Ubuntu 系统
# ssh-copy-id -i ~/.ssh/id_rsa.pub ubuntu@your-ec2-ip
```

### 方法 B: 手动添加（如果方法 A 不工作）

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

### 方法 C: 使用 AWS Systems Manager（如果无法直接 SSH）

如果您无法直接 SSH 连接，可以使用 AWS Systems Manager：

1. 在 AWS 控制台打开 **Systems Manager** → **Session Manager**
2. 连接到您的 EC2 实例
3. 执行上述方法 B 的步骤 3

## ✅ 步骤 4: 测试 SSH 连接

```bash
# 测试是否可以无密码连接
ssh ec2-user@your-ec2-ip

# 如果成功，您应该能够直接登录，不需要输入密码
```

## 🔐 步骤 5: 配置 GitHub Secrets

1. **获取私钥内容**：
   ```bash
   cat ~/.ssh/id_rsa
   ```

2. **复制完整的私钥内容**（包括 `-----BEGIN RSA PRIVATE KEY-----` 和 `-----END RSA PRIVATE KEY-----`）

3. **在 GitHub 中添加 Secret**：
   - 进入仓库 → **Settings** → **Secrets and variables** → **Actions**
   - 点击 **New repository secret**
   - Name: `EC2_SSH_KEY`
   - Secret: 粘贴完整的私钥内容
   - 点击 **Add secret**

## 📝 完整示例

假设您的 EC2 IP 是 `54.123.45.67`，用户是 `ec2-user`：

```bash
# 1. 生成密钥
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy"
# 按回车使用默认位置，可以设置密码或跳过

# 2. 查看私钥（用于 GitHub）
cat ~/.ssh/id_rsa

# 3. 查看公钥（用于 EC2）
cat ~/.ssh/id_rsa.pub

# 4. 将公钥添加到 EC2
ssh-copy-id -i ~/.ssh/id_rsa.pub ec2-user@54.123.45.67

# 5. 测试连接
ssh ec2-user@54.123.45.67
```

## ⚠️ 常见问题

### Q1: ssh-copy-id 命令不存在

**解决方案**：手动添加公钥（使用方法 B）

### Q2: 提示 "Permission denied"

**可能原因**：
- 公钥未正确添加到服务器
- 文件权限不正确

**解决方案**：
```bash
# 在 EC2 服务器上检查权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Q3: 仍然需要输入密码

**解决方案**：
- 确保公钥已正确添加到 `~/.ssh/authorized_keys`
- 检查文件权限（必须是 600）
- 检查 SSH 配置：`cat ~/.ssh/config`

### Q4: 如何查看私钥内容？

```bash
# 显示私钥
cat ~/.ssh/id_rsa

# 如果使用其他名称的密钥
cat ~/.ssh/id_ed25519
```

## 🔒 安全提示

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

## 🎯 下一步

配置完 SSH 密钥后，继续配置其他 GitHub Secrets：
- `EC2_HOST`
- `EC2_USER`
- `EC2_DEPLOY_PATH`（可选）

然后就可以测试自动部署了！

