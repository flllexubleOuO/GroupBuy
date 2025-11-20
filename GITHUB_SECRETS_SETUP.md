# GitHub Secrets 配置指南

本指南将详细说明如何在 GitHub 仓库中配置 Secrets，以便 GitHub Actions 能够自动部署到 EC2 服务器。

## 📋 需要配置的 Secrets 列表

| Secret 名称 | 是否必需 | 说明 | 示例值 |
|------------|---------|------|--------|
| `EC2_HOST` | ✅ 必需 | EC2 服务器的 IP 地址或域名 | `ec2-54-123-45-67.compute-1.amazonaws.com` 或 `54.123.45.67` |
| `EC2_USER` | ✅ 必需 | SSH 登录用户名 | `ec2-user` (Amazon Linux) 或 `ubuntu` (Ubuntu) |
| `EC2_SSH_KEY` | ✅ 必需 | SSH 私钥的完整内容 | 见下方说明 |
| `EC2_DEPLOY_PATH` | ⚠️ 可选 | 项目在服务器上的部署路径 | `/home/ec2-user/tuangou-project` |

## 🚀 配置步骤

### 步骤 1: 进入 GitHub 仓库设置

1. 打开您的 GitHub 仓库页面
2. 点击仓库顶部的 **Settings**（设置）标签
3. 在左侧菜单中找到 **Secrets and variables** → **Actions**
4. 点击进入

### 步骤 2: 添加第一个 Secret - EC2_HOST

1. 点击 **New repository secret** 按钮
2. 在 **Name** 字段输入：`EC2_HOST`
3. 在 **Secret** 字段输入您的 EC2 服务器地址：
   - 可以是 IP 地址：`54.123.45.67`
   - 也可以是域名：`ec2-54-123-45-67.compute-1.amazonaws.com`
4. 点击 **Add secret** 保存

**如何获取 EC2_HOST？**
- 在 AWS EC2 控制台的实例详情中查看 **Public IPv4 address** 或 **Public IPv4 DNS**

### 步骤 3: 添加第二个 Secret - EC2_USER

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

### 步骤 4: 添加第三个 Secret - EC2_SSH_KEY（最重要）

这是最关键的配置，需要 SSH 私钥的完整内容。

#### 4.1 获取 SSH 私钥

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

如果您还没有 SSH 密钥：

```bash
# 生成新的 SSH 密钥对
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 按提示操作，建议使用默认路径 ~/.ssh/id_rsa
# 然后查看私钥
cat ~/.ssh/id_rsa

# 将公钥添加到 EC2 服务器
ssh-copy-id -i ~/.ssh/id_rsa.pub ec2-user@your-ec2-ip
```

#### 4.2 复制私钥内容

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

#### 4.3 在 GitHub 中添加 EC2_SSH_KEY

1. 点击 **New repository secret** 按钮
2. 在 **Name** 字段输入：`EC2_SSH_KEY`
3. 在 **Secret** 字段粘贴完整的私钥内容（包括头尾标记）
4. 点击 **Add secret** 保存

### 步骤 5: 添加第四个 Secret - EC2_DEPLOY_PATH（可选）

如果您想使用默认路径 `/home/ec2-user/tuangou-project`，可以跳过此步骤。

如果需要自定义部署路径：

1. 点击 **New repository secret** 按钮
2. 在 **Name** 字段输入：`EC2_DEPLOY_PATH`
3. 在 **Secret** 字段输入部署路径，例如：
   - `/home/ec2-user/tuangou-project`
   - `/var/www/tuangou-project`
   - `/opt/apps/tuangou-project`
4. 点击 **Add secret** 保存

## ✅ 验证配置

配置完成后，您应该看到以下 Secrets：

```
EC2_HOST          ✅
EC2_USER          ✅
EC2_SSH_KEY       ✅
EC2_DEPLOY_PATH   ⚠️ (可选)
```

## 🧪 测试配置

### 方法 1: 手动触发部署

1. 在 GitHub 仓库中，点击 **Actions** 标签
2. 选择 **Deploy to EC2** workflow
3. 点击 **Run workflow** 按钮
4. 选择分支（通常是 `main`）
5. 点击 **Run workflow**

### 方法 2: 推送代码触发

```bash
# 在本地终端执行
git add .
git commit -m "测试自动部署"
git push origin main
```

### 查看部署日志

1. 在 **Actions** 标签页中，点击最新的 workflow 运行
2. 查看每个步骤的日志
3. 如果出现错误，检查：
   - Secrets 是否正确配置
   - EC2 服务器是否可以访问
   - SSH 密钥是否正确

## 🔒 安全注意事项

1. **永远不要**将私钥提交到代码仓库
2. **永远不要**在公开场合分享私钥
3. 定期轮换 SSH 密钥
4. 使用最小权限原则配置 EC2 安全组
5. 考虑使用 IAM 角色而不是访问密钥

## 🐛 常见问题

### Q1: 提示 "Permission denied (publickey)"

**原因**：SSH 私钥配置不正确或公钥未添加到服务器

**解决方案**：
1. 检查 `EC2_SSH_KEY` 是否包含完整的私钥（包括头尾标记）
2. 确保私钥格式正确，没有多余的空格
3. 将对应的公钥添加到 EC2 服务器：
   ```bash
   # 在本地执行
   ssh-copy-id -i ~/.ssh/id_rsa.pub ec2-user@your-ec2-ip
   ```

### Q2: 提示 "Host key verification failed"

**原因**：服务器指纹验证失败

**解决方案**：
- 这通常不是问题，workflow 中已配置跳过主机验证
- 如果仍有问题，检查 `EC2_HOST` 是否正确

### Q3: 提示 "Connection refused" 或 "Connection timed out"

**原因**：无法连接到 EC2 服务器

**解决方案**：
1. 检查 `EC2_HOST` 是否正确
2. 检查 EC2 安全组是否允许 SSH（端口 22）访问
3. 检查 EC2 实例是否正在运行
4. 检查网络连接

### Q4: 如何更新 Secret？

1. 进入 **Settings** → **Secrets and variables** → **Actions**
2. 找到要更新的 Secret
3. 点击右侧的 **Update** 按钮
4. 修改值后保存

### Q5: 如何删除 Secret？

1. 进入 **Settings** → **Secrets and variables** → **Actions**
2. 找到要删除的 Secret
3. 点击右侧的 **Delete** 按钮
4. 确认删除

## 📝 快速检查清单

在开始部署前，请确认：

- [ ] `EC2_HOST` 已配置，值为正确的服务器地址
- [ ] `EC2_USER` 已配置，值为正确的用户名
- [ ] `EC2_SSH_KEY` 已配置，包含完整的私钥内容
- [ ] `EC2_DEPLOY_PATH` 已配置（或使用默认值）
- [ ] EC2 服务器可以 SSH 连接
- [ ] EC2 安全组允许 SSH 访问（端口 22）
- [ ] 服务器上已安装 Node.js、npm、PM2、Git
- [ ] 服务器上已创建部署目录

## 🔗 相关文档

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [GitHub Secrets 文档](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS EC2 连接文档](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AccessingInstances.html)

