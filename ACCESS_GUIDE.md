# 访问网页服务指南

本指南说明如何访问部署在 EC2 上的团购系统服务。

## 📍 快速访问

应用运行在 **端口 3000**，您可以通过以下方式访问：

### 方法 1: 直接通过 IP 和端口访问（最简单）

```
http://您的EC2-IP地址:3000
```

例如：
- 前台下单页面: `http://54.123.45.67:3000/order`
- 订单查询: `http://54.123.45.67:3000/query-order`
- 后台管理: `http://54.123.45.67:3000/admin/login`

**如何获取 EC2 IP 地址？**
- 在 GitHub Secrets 中查看 `EC2_HOST` 的值
- 或在 AWS EC2 控制台的实例详情中查看 **Public IPv4 address**

## 🔒 配置 EC2 安全组（必需）

在访问之前，**必须**确保 EC2 安全组允许端口 3000 的入站流量：

### 步骤 1: 进入 AWS EC2 控制台

1. 登录 AWS 控制台
2. 进入 **EC2** → **Instances**
3. 选择您的 EC2 实例

### 步骤 2: 配置安全组

1. 点击实例下方的 **Security** 标签
2. 点击安全组名称（例如：`sg-xxxxxxxxx`）
3. 点击 **Inbound rules**（入站规则）标签
4. 点击 **Edit inbound rules**（编辑入站规则）

### 步骤 3: 添加规则

点击 **Add rule**，配置如下：

| 类型 | 协议 | 端口范围 | 来源 | 描述 |
|------|------|---------|------|------|
| Custom TCP | TCP | 3000 | 0.0.0.0/0 | 允许所有 IP 访问（生产环境建议限制为特定 IP） |
| 或 | | | | |
| Custom TCP | TCP | 3000 | 您的IP/32 | 仅允许您的 IP 访问（更安全） |

**安全建议**：
- 如果只是测试，可以使用 `0.0.0.0/0`（允许所有 IP）
- 生产环境建议使用 `您的IP/32`（仅允许您的 IP 访问）
- 或者使用 `您的IP段/24`（允许您的 IP 段访问）

### 步骤 4: 保存规则

点击 **Save rules** 保存。

## 🌐 可用的页面路由

部署成功后，以下页面可以访问：

| 路由 | 说明 | 示例 URL |
|------|------|----------|
| `/` | 首页（重定向到下单页面） | `http://IP:3000/` |
| `/order` | 前台下单页面 | `http://IP:3000/order` |
| `/query-order` | 订单查询页面 | `http://IP:3000/query-order` |
| `/success` | 下单成功页面 | `http://IP:3000/success?orderId=xxx` |
| `/admin/login` | 后台管理登录 | `http://IP:3000/admin/login` |
| `/admin/orders` | 订单列表（需登录） | `http://IP:3000/admin/orders` |
| `/admin/packages` | 套餐管理（需登录） | `http://IP:3000/admin/packages` |

## 🔐 后台管理登录

默认管理员账号（请在 `.env` 文件中修改）：

- **用户名**: `admin`
- **密码**: `admin123`（或您在 `.env` 中设置的密码）

**重要**：首次部署后，请立即修改默认密码！

## ✅ 验证服务是否运行

### 方法 1: 在浏览器中访问

直接在浏览器中访问：
```
http://您的EC2-IP:3000
```

如果看到页面，说明服务正常运行。

### 方法 2: 使用 curl 命令

```bash
curl http://您的EC2-IP:3000
```

如果返回 HTML 内容，说明服务正常运行。

### 方法 3: SSH 到服务器检查

```bash
# SSH 连接到 EC2
ssh ec2-user@您的EC2-IP

# 检查 PM2 进程状态
pm2 status

# 查看应用日志
pm2 logs group-buy-system --lines 50

# 检查端口是否监听
sudo netstat -tulpn | grep 3000
# 或使用 ss 命令
sudo ss -tulpn | grep 3000
```

## 🚀 配置域名（可选，推荐）

如果您有域名，可以配置域名访问：

### 方法 1: 使用 Nginx 反向代理（推荐）

1. **安装 Nginx**：
   ```bash
   sudo dnf install nginx -y  # Amazon Linux 2023
   # 或
   sudo apt install nginx -y  # Ubuntu
   ```

2. **配置 Nginx**：
   ```bash
   sudo nano /etc/nginx/conf.d/tuangou.conf
   ```

   添加以下配置：
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;  # 替换为您的域名

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **测试并重启 Nginx**：
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   sudo systemctl enable nginx
   ```

4. **配置安全组**：
   - 允许端口 80（HTTP）和 443（HTTPS）的入站流量

5. **访问**：
   ```
   http://your-domain.com
   ```

### 方法 2: 使用 CloudFront（AWS CDN）

如果您使用 AWS，可以配置 CloudFront 分发，提供 CDN 加速和 HTTPS。

## 🔒 配置 HTTPS（推荐用于生产环境）

### 使用 Let's Encrypt（免费 SSL 证书）

1. **安装 Certbot**：
   ```bash
   sudo dnf install certbot python3-certbot-nginx -y
   ```

2. **获取证书**：
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **自动续期**：
   Certbot 会自动配置自动续期，证书每 90 天自动更新。

## 🐛 故障排查

### 问题 1: 无法访问网站

**可能原因**：
- 安全组未配置端口 3000
- 服务未启动
- 防火墙阻止

**解决方案**：
1. 检查安全组配置
2. SSH 到服务器检查服务状态：`pm2 status`
3. 检查防火墙：`sudo firewall-cmd --list-all`

### 问题 2: 连接超时

**可能原因**：
- EC2 实例未运行
- 安全组配置错误
- 网络问题

**解决方案**：
1. 检查 EC2 实例状态
2. 验证安全组规则
3. 检查 PM2 日志：`pm2 logs group-buy-system`

### 问题 3: 502 Bad Gateway（如果使用 Nginx）

**可能原因**：
- 后端服务未运行
- Nginx 配置错误

**解决方案**：
1. 检查后端服务：`pm2 status`
2. 检查 Nginx 错误日志：`sudo tail -f /var/log/nginx/error.log`
3. 验证 Nginx 配置：`sudo nginx -t`

## 📝 快速检查清单

在访问服务前，请确认：

- [ ] EC2 实例正在运行
- [ ] 安全组允许端口 3000 的入站流量
- [ ] PM2 进程正在运行（`pm2 status`）
- [ ] 应用日志没有错误（`pm2 logs group-buy-system`）
- [ ] 端口 3000 正在监听（`sudo ss -tulpn | grep 3000`）

## 🔗 相关文档

- [EC2 安全组配置](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-security-groups.html)
- [Nginx 反向代理配置](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Let's Encrypt 文档](https://letsencrypt.org/docs/)

## 💡 提示

1. **生产环境建议**：
   - 使用域名而不是 IP 访问
   - 配置 HTTPS
   - 限制安全组访问来源
   - 定期更新依赖和系统

2. **性能优化**：
   - 考虑使用 CloudFront CDN
   - 配置 Nginx 缓存
   - 使用 PM2 集群模式（如果流量大）

3. **监控**：
   - 使用 PM2 监控：`pm2 monit`
   - 查看日志：`pm2 logs group-buy-system`
   - 设置告警（可选）

