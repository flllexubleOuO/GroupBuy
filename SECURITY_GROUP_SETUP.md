# EC2 安全组配置指南

## 🔍 当前状态分析

从您收到的错误响应 `{"error":"服务器内部错误"}` 来看：
- ✅ **安全组配置是正确的** - 因为您能收到服务器的响应
- ✅ **端口 3000 是开放的** - 请求成功到达了应用
- ⚠️ **应用内部有错误** - 这是应用代码的问题，不是安全组问题

如果安全组配置错误，您会看到：
- ❌ **连接超时** (Connection timeout)
- ❌ **连接被拒绝** (Connection refused)
- ❌ **无法访问** (无法建立连接)

## 📋 安全组配置步骤

### 方法 1: 通过 AWS 控制台配置（推荐）

#### 步骤 1: 进入 EC2 控制台

1. 登录 [AWS 控制台](https://console.aws.amazon.com)
2. 进入 **EC2** 服务
3. 点击左侧菜单 **Instances** (实例)
4. 选择您的 EC2 实例

#### 步骤 2: 查看当前安全组

1. 在实例详情页面，找到 **Security** (安全) 标签
2. 点击安全组名称（例如：`sg-0123456789abcdef0`）

#### 步骤 3: 配置入站规则（Inbound Rules）

1. 点击 **Inbound rules** (入站规则) 标签
2. 点击 **Edit inbound rules** (编辑入站规则)

#### 步骤 4: 添加端口 3000 规则

点击 **Add rule**，配置如下：

**测试环境配置**（允许所有 IP 访问）：
```
Type: Custom TCP
Protocol: TCP
Port range: 3000
Source: 0.0.0.0/0
Description: Allow HTTP access to application
```

**生产环境配置**（仅允许特定 IP，更安全）：
```
Type: Custom TCP
Protocol: TCP
Port range: 3000
Source: 您的IP地址/32
Description: Allow HTTP access from my IP
```

**如何获取您的 IP**：
- 访问 https://whatismyipaddress.com/
- 或运行：`curl ifconfig.me`

#### 步骤 5: 保存规则

点击 **Save rules** 保存配置。

### 方法 2: 使用 AWS CLI 配置

如果您安装了 AWS CLI：

```bash
# 获取您的公网 IP
MY_IP=$(curl -s ifconfig.me)

# 添加规则（替换 sg-xxxxxxxxx 为您的安全组 ID）
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 3000 \
  --cidr ${MY_IP}/32 \
  --description "Allow access from my IP"

# 或允许所有 IP（不推荐用于生产）
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0 \
  --description "Allow HTTP access to application"
```

## 🔒 推荐的安全组配置

### 最小权限原则配置

| 类型 | 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|------|
| SSH | TCP | 22 | 您的IP/32 | 仅允许您的 IP SSH 访问 |
| Custom TCP | TCP | 3000 | 您的IP/32 | 仅允许您的 IP 访问应用 |
| 或 | | | 您的IP段/24 | 允许您的 IP 段访问 |

### 测试环境配置

| 类型 | 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|------|
| SSH | TCP | 22 | 您的IP/32 | SSH 访问 |
| Custom TCP | TCP | 3000 | 0.0.0.0/0 | 允许所有 IP 访问（测试用） |

### 生产环境配置（使用 Nginx）

| 类型 | 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|------|
| SSH | TCP | 22 | 您的IP/32 | SSH 访问 |
| HTTP | TCP | 80 | 0.0.0.0/0 | HTTP 访问（Nginx） |
| HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS 访问（Nginx） |
| Custom TCP | TCP | 3000 | 127.0.0.1/32 | 仅本地访问（Nginx 反向代理） |

## ✅ 验证安全组配置

### 方法 1: 在 AWS 控制台检查

1. 进入安全组页面
2. 查看 **Inbound rules**
3. 确认端口 3000 的规则存在

### 方法 2: 使用命令行测试

```bash
# 测试端口是否开放
telnet 16.176.25.194 3000

# 或使用 curl
curl -v http://16.176.25.194:3000

# 或使用 nc (netcat)
nc -zv 16.176.25.194 3000
```

**预期结果**：
- ✅ 如果端口开放：连接成功或收到 HTTP 响应
- ❌ 如果端口关闭：连接超时

### 方法 3: 在服务器上检查

```bash
# SSH 到服务器
ssh ec2-user@16.176.25.194

# 检查端口是否监听
sudo ss -tulpn | grep 3000

# 应该看到类似：
# tcp   LISTEN  0  128  *:3000  *:*  users:(("node",pid=1234,fd=20))
```

## 🛠️ 故障排查

### 问题 1: 连接超时

**症状**：浏览器显示 "连接超时" 或 "无法访问此网站"

**原因**：安全组未允许端口 3000

**解决**：
1. 检查安全组入站规则
2. 添加端口 3000 规则
3. 等待几秒钟让规则生效

### 问题 2: 连接被拒绝

**症状**：浏览器显示 "连接被拒绝"

**原因**：应用未运行或端口未监听

**解决**：
```bash
# SSH 到服务器检查
ssh ec2-user@16.176.25.194
pm2 status
pm2 restart group-buy-system
```

### 问题 3: 只能从特定 IP 访问

**症状**：某些地方能访问，某些地方不能

**原因**：安全组配置为仅允许特定 IP

**解决**：
- 添加更多 IP 到安全组
- 或临时改为 `0.0.0.0/0`（仅用于测试）

## 🔐 安全最佳实践

### 1. 使用最小权限原则

- ✅ 仅开放必要的端口
- ✅ 限制 SSH 访问来源（仅您的 IP）
- ✅ 生产环境限制应用端口访问来源

### 2. 使用 Nginx 反向代理（推荐）

- 应用端口 3000 仅允许本地访问（127.0.0.1）
- Nginx 监听 80/443 端口对外提供服务
- 更安全、更灵活

### 3. 定期审查安全组规则

- 删除不再使用的规则
- 检查是否有不必要的开放端口
- 使用安全组标签便于管理

### 4. 使用 VPC 和私有子网

- 将应用放在私有子网
- 使用负载均衡器对外提供服务
- 更高级的安全架构

## 📝 快速检查清单

在配置安全组前，确认：

- [ ] 知道您的 EC2 实例 ID
- [ ] 知道安全组 ID
- [ ] 知道您的公网 IP（如果限制访问来源）
- [ ] 知道应用监听的端口（3000）

配置后验证：

- [ ] 安全组规则已保存
- [ ] 可以从浏览器访问应用
- [ ] SSH 访问仍然正常
- [ ] 应用日志没有错误

## 🚀 下一步

配置好安全组后：

1. **验证访问**：在浏览器中访问 `http://您的IP:3000`
2. **检查应用日志**：如果仍有错误，查看 PM2 日志
3. **配置域名**（可选）：使用 Nginx 配置域名访问
4. **配置 HTTPS**（推荐）：使用 Let's Encrypt 配置 SSL

## 💡 提示

- 安全组规则更改通常立即生效
- 如果更改后仍无法访问，等待 1-2 分钟再试
- 使用 AWS 控制台的 "Test connectivity" 功能测试连接
- 生产环境建议使用 Nginx + HTTPS，而不是直接暴露端口 3000

