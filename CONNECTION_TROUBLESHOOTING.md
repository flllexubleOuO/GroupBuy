# EC2 实例连接问题排查指南

## 🔍 快速诊断

首先确定是哪种连接问题：

1. **SSH 连接不上** - 无法通过 SSH 登录服务器
2. **网页访问不上** - 无法访问应用（http://IP:3000）
3. **两者都连不上** - 可能是实例问题

## 📋 排查步骤

### 步骤 1: 检查实例状态

#### 在 AWS 控制台检查

1. 登录 [AWS 控制台](https://console.aws.amazon.com)
2. 进入 **EC2** → **Instances**
3. 找到您的实例（IP: 16.176.25.194）
4. 检查 **Instance state**（实例状态）

**正常状态**：
- ✅ `running` - 实例正在运行

**异常状态**：
- ⚠️ `stopped` - 实例已停止（需要启动）
- ⚠️ `stopping` - 实例正在停止
- ⚠️ `pending` - 实例正在启动
- ❌ `terminated` - 实例已终止

**如果实例已停止**：
1. 选择实例
2. 点击 **Instance state** → **Start instance**
3. 等待实例启动（通常 1-2 分钟）
4. 注意：启动后 IP 地址可能会改变！

### 步骤 2: 检查安全组配置

#### 检查 SSH 访问（端口 22）

1. 选择实例 → **Security** 标签
2. 点击安全组名称
3. 查看 **Inbound rules**

**SSH 规则应该存在**：
```
Type: SSH
Protocol: TCP
Port: 22
Source: 您的IP/32 或 0.0.0.0/0
```

**如果没有 SSH 规则**：
1. 点击 **Edit inbound rules**
2. 点击 **Add rule**
3. 配置：
   - Type: SSH
   - Port: 22
   - Source: `您的IP/32`（推荐）或 `0.0.0.0/0`（测试用）
4. 点击 **Save rules**

#### 检查应用访问（端口 3000）

**应用端口规则应该存在**：
```
Type: Custom TCP
Protocol: TCP
Port: 3000
Source: 0.0.0.0/0 或 您的IP/32
```

### 步骤 3: 检查网络连接

#### 测试 SSH 连接

```bash
# 测试 SSH 连接
ssh -v ec2-user@16.176.25.194

# 如果使用密钥文件
ssh -i ~/.ssh/id_rsa ec2-user@16.176.25.194
```

**常见错误**：

1. **Connection timeout（连接超时）**
   - 原因：安全组未允许 SSH 或实例未运行
   - 解决：检查安全组和实例状态

2. **Permission denied（权限被拒绝）**
   - 原因：SSH 密钥错误或用户错误
   - 解决：检查 SSH 密钥和用户名

3. **Host key verification failed**
   - 解决：`ssh-keygen -R 16.176.25.194`

#### 测试应用端口

```bash
# 测试端口 3000 是否开放
telnet 16.176.25.194 3000

# 或使用 curl
curl -v http://16.176.25.194:3000

# 或使用 nc
nc -zv 16.176.25.194 3000
```

**预期结果**：
- ✅ 连接成功 → 端口开放
- ❌ 连接超时 → 安全组未配置或应用未运行

### 步骤 4: 检查您的 IP 地址

安全组可能只允许特定 IP 访问，需要确认您的 IP：

```bash
# 查看您的公网 IP
curl ifconfig.me
# 或
curl ipinfo.io/ip
```

然后在 AWS 控制台检查安全组规则中的 Source 是否包含您的 IP。

### 步骤 5: 使用 AWS Systems Manager（如果 SSH 不可用）

如果 SSH 无法连接，可以使用 AWS Systems Manager Session Manager：

1. 在 EC2 控制台选择实例
2. 点击 **Connect**（连接）
3. 选择 **Session Manager** 标签
4. 点击 **Connect**

**注意**：需要为实例配置 IAM 角色和 Systems Manager 权限。

## 🛠️ 常见问题解决

### 问题 1: 实例已停止

**症状**：无法连接，实例状态显示 `stopped`

**解决**：
1. 在 AWS 控制台选择实例
2. 点击 **Instance state** → **Start instance**
3. 等待实例启动（状态变为 `running`）
4. **重要**：启动后 IP 地址可能会改变！
5. 更新 GitHub Secrets 中的 `EC2_HOST`（如果 IP 改变）

### 问题 2: IP 地址已改变

**症状**：之前能连接，现在连不上

**可能原因**：
- 实例重启后分配了新 IP
- 实例被停止后重新启动

**解决**：
1. 在 AWS 控制台查看新的 **Public IPv4 address**
2. 更新 GitHub Secrets 中的 `EC2_HOST`
3. 更新 SSH 配置

### 问题 3: 安全组规则丢失

**症状**：之前能连接，现在连不上，实例状态正常

**解决**：
1. 检查安全组规则
2. 重新添加 SSH（22）和应用（3000）规则
3. 确保 Source 包含您的 IP

### 问题 4: SSH 密钥问题

**症状**：SSH 连接时提示 "Permission denied"

**解决**：
```bash
# 检查密钥文件权限
chmod 600 ~/.ssh/id_rsa

# 使用正确的密钥文件
ssh -i /path/to/your-key.pem ec2-user@16.176.25.194

# 检查用户名（不同系统可能不同）
# Amazon Linux: ec2-user
# Ubuntu: ubuntu
# CentOS: centos
```

### 问题 5: 防火墙阻止

**症状**：安全组配置正确，但仍无法连接

**解决**：
```bash
# SSH 到服务器后检查防火墙
sudo firewall-cmd --list-all  # CentOS/RHEL
# 或
sudo ufw status  # Ubuntu

# 如果需要，允许端口
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 🔄 快速修复流程

### 如果完全无法连接：

1. **检查实例状态**
   ```
   AWS 控制台 → EC2 → Instances → 查看状态
   ```

2. **如果实例已停止，启动它**
   ```
   选择实例 → Instance state → Start instance
   ```

3. **检查并更新 IP 地址**
   ```
   查看新的 Public IPv4 address
   更新 GitHub Secrets 中的 EC2_HOST
   ```

4. **检查安全组**
   ```
   实例 → Security → 安全组 → Inbound rules
   确保有 SSH (22) 和应用 (3000) 规则
   ```

5. **测试连接**
   ```bash
   # 测试 SSH
   ssh ec2-user@新IP地址
   
   # 测试应用
   curl http://新IP地址:3000
   ```

## 📝 检查清单

在尝试连接前，确认：

- [ ] 实例状态为 `running`
- [ ] 知道当前的公网 IP 地址
- [ ] 安全组允许 SSH (22) 端口
- [ ] 安全组允许应用 (3000) 端口
- [ ] 您的 IP 在安全组允许列表中（如果有限制）
- [ ] SSH 密钥文件权限正确 (600)
- [ ] 使用正确的用户名（ec2-user/ubuntu/centos）

## 🆘 紧急情况处理

### 如果实例完全无法访问：

1. **使用 AWS Systems Manager**
   - 在 EC2 控制台点击 **Connect** → **Session Manager**
   - 无需 SSH，直接在浏览器中访问

2. **重启实例**
   - 在 AWS 控制台选择实例
   - **Instance state** → **Reboot instance**
   - 等待 1-2 分钟

3. **创建新的实例**（最后手段）
   - 从当前实例创建 AMI
   - 启动新实例
   - 更新配置

## 💡 预防措施

1. **使用弹性 IP（Elastic IP）**
   - 分配弹性 IP 给实例
   - IP 地址不会改变
   - 避免重启后 IP 变化的问题

2. **配置安全组标签**
   - 给安全组添加标签便于管理
   - 记录允许的 IP 范围

3. **定期备份**
   - 创建 AMI 快照
   - 备份重要数据

4. **监控实例状态**
   - 使用 CloudWatch 监控
   - 设置告警

## 🔗 相关资源

- [AWS EC2 连接文档](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AccessingInstances.html)
- [安全组配置文档](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-security-groups.html)
- [Systems Manager Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html)

