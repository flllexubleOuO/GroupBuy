# 域名和 HTTPS 配置指南

本指南将帮助您配置域名和 HTTPS 证书，使应用可以通过域名安全访问。

## 📋 前置要求

- EC2 实例已运行并可以 SSH 连接
- 应用已部署并运行在端口 3000
- 您有一个域名（例如：example.com）
- 域名的 DNS 管理权限

## 🚀 快速配置（推荐）

使用自动化脚本一键配置：

```bash
# SSH 连接到 EC2
ssh ec2-user@your-ec2-ip

# 下载并运行配置脚本
curl -O https://raw.githubusercontent.com/your-repo/domain-https-setup.sh
# 或者直接创建脚本（见下方）

# 运行配置脚本
bash domain-https-setup.sh your-domain.com
```

## 📝 手动配置步骤

### 步骤 1: 配置 DNS 记录

在您的域名 DNS 提供商（如 Route 53、Cloudflare、GoDaddy 等）添加 A 记录：

```
类型: A
名称: @ (或 www，或您想要的子域名)
值: 您的 EC2 公网 IP 地址
TTL: 300 (或默认值)
```

**示例**：
- 如果您的域名是 `example.com`，添加 A 记录指向 EC2 IP
- 如果需要 `www.example.com`，再添加一条 A 记录，名称为 `www`

**验证 DNS**：
```bash
# 检查 DNS 是否生效（可能需要几分钟到几小时）
dig your-domain.com
# 或
nslookup your-domain.com
```

### 步骤 2: 安装 Nginx

在 EC2 服务器上执行：

```bash
# Amazon Linux 2023
sudo dnf install -y nginx

# Ubuntu
# sudo apt update && sudo apt install -y nginx

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证 Nginx 运行状态
sudo systemctl status nginx
```

### 步骤 3: 配置 Nginx 反向代理

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/conf.d/tuangou.conf
```

添加以下内容（将 `your-domain.com` 替换为您的域名）：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 重定向到 HTTPS（在配置 SSL 后启用）
    # return 301 https://$server_name$request_uri;

    # 临时允许 HTTP 访问（用于获取 SSL 证书）
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

保存并测试配置：

```bash
# 测试 Nginx 配置
sudo nginx -t

# 如果测试通过，重新加载 Nginx
sudo systemctl reload nginx
```

### 步骤 4: 更新 EC2 安全组

在 AWS EC2 控制台：

1. 进入 **Security Groups**（安全组）
2. 选择您的实例的安全组
3. 编辑 **Inbound rules**（入站规则）
4. 添加以下规则：

| 类型 | 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|------|
| HTTP | TCP | 80 | 0.0.0.0/0 | HTTP 访问 |
| HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS 访问 |

5. 可选：限制端口 3000 仅允许本地访问（127.0.0.1/32）

### 步骤 5: 安装 Certbot（Let's Encrypt）

```bash
# Amazon Linux 2023
sudo dnf install -y certbot python3-certbot-nginx

# Ubuntu
# sudo apt install -y certbot python3-certbot-nginx
```

### 步骤 6: 获取 SSL 证书

```bash
# 获取 SSL 证书（将 your-domain.com 替换为您的域名）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 按照提示操作：
# 1. 输入邮箱地址（用于证书到期提醒）
# 2. 同意服务条款
# 3. 选择是否分享邮箱（可选）
```

Certbot 会自动：
- 验证域名所有权
- 获取 SSL 证书
- 配置 Nginx 使用 HTTPS
- 设置自动续期

### 步骤 7: 启用 HTTPS 重定向

Certbot 通常会自动配置，如果没有，编辑 Nginx 配置：

```bash
sudo nano /etc/nginx/conf.d/tuangou.conf
```

确保有 HTTPS 配置：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL 配置（Certbot 会自动添加）
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

重新加载 Nginx：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤 8: 验证 SSL 证书自动续期

```bash
# 测试自动续期
sudo certbot renew --dry-run

# 查看续期任务（通常已自动配置）
sudo systemctl status certbot.timer
```

## ✅ 验证配置

1. **访问 HTTP**（应自动重定向到 HTTPS）：
   ```
   http://your-domain.com
   ```

2. **访问 HTTPS**：
   ```
   https://your-domain.com
   ```

3. **检查 SSL 证书**：
   - 浏览器地址栏应显示锁图标
   - 点击锁图标查看证书详情

## 🔧 常见问题

### Q1: Certbot 验证失败

**原因**：DNS 未生效或域名未正确指向 EC2 IP

**解决方案**：
```bash
# 检查 DNS
dig your-domain.com
# 确保返回的 IP 是您的 EC2 IP

# 等待 DNS 传播（可能需要几分钟到几小时）
```

### Q2: Nginx 502 Bad Gateway

**原因**：应用未运行或端口 3000 未监听

**解决方案**：
```bash
# 检查应用是否运行
pm2 status

# 检查端口 3000
sudo ss -tulpn | grep 3000

# 重启应用
cd /home/ec2-user/tuangou-project
pm2 restart group-buy-system
```

### Q3: SSL 证书过期

**解决方案**：
```bash
# 手动续期
sudo certbot renew

# 检查自动续期状态
sudo systemctl status certbot.timer
```

### Q4: 需要更新域名

**解决方案**：
```bash
# 删除旧证书
sudo certbot delete --cert-name old-domain.com

# 获取新证书
sudo certbot --nginx -d new-domain.com
```

## 📚 相关文件

- Nginx 配置：`/etc/nginx/conf.d/tuangou.conf`
- SSL 证书：`/etc/letsencrypt/live/your-domain.com/`
- Nginx 日志：`/var/log/nginx/`

## 🔒 安全建议

1. **限制 SSH 访问**：在安全组中只允许特定 IP 访问端口 22
2. **使用防火墙**：配置 `firewalld` 或 `ufw` 进一步限制访问
3. **定期更新**：保持系统和软件包更新
4. **监控日志**：定期检查 Nginx 和应用日志

## 🎉 完成

配置完成后，您的应用可以通过以下方式访问：

- ✅ `https://your-domain.com` - 主域名
- ✅ `https://www.your-domain.com` - www 子域名（如果配置）
- ✅ 自动 HTTP 到 HTTPS 重定向
- ✅ 自动 SSL 证书续期

