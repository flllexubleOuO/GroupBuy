#!/bin/bash

# 域名和 HTTPS 自动配置脚本
# 使用方法: bash scripts/setup-domain-https.sh your-domain.com

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "❌ 错误：请提供域名"
  echo "使用方法: bash scripts/setup-domain-https.sh your-domain.com"
  exit 1
fi

echo "🚀 开始配置域名和 HTTPS..."
echo "域名: $DOMAIN"

# 检测操作系统
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  echo "❌ 无法检测操作系统"
  exit 1
fi

echo "📦 检测到操作系统: $OS"

# 安装 Nginx
echo "📦 安装 Nginx..."
if [ "$OS" == "amzn" ] || [ "$OS" == "rhel" ]; then
  sudo dnf install -y nginx
elif [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
  sudo apt update
  sudo apt install -y nginx
else
  echo "❌ 不支持的操作系统: $OS"
  exit 1
fi

# 启动并启用 Nginx
echo "🔄 启动 Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# 创建 Nginx 配置文件
echo "📝 创建 Nginx 配置..."
sudo tee /etc/nginx/conf.d/tuangou.conf > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 测试 Nginx 配置
echo "🔍 测试 Nginx 配置..."
sudo nginx -t

# 重新加载 Nginx
echo "🔄 重新加载 Nginx..."
sudo systemctl reload nginx

# 安装 Certbot
echo "📦 安装 Certbot..."
if [ "$OS" == "amzn" ] || [ "$OS" == "rhel" ]; then
  sudo dnf install -y certbot python3-certbot-nginx
elif [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
  sudo apt install -y certbot python3-certbot-nginx
fi

# 获取 SSL 证书
echo "🔐 获取 SSL 证书..."
echo "⚠️  请确保域名 $DOMAIN 已正确配置 DNS A 记录指向此服务器"
echo "⚠️  按 Enter 继续，或 Ctrl+C 取消..."
read

sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || {
  echo "❌ SSL 证书获取失败"
  echo "请检查："
  echo "1. DNS 记录是否正确配置"
  echo "2. 域名是否已指向此服务器 IP"
  echo "3. 端口 80 是否在安全组中开放"
  exit 1
}

# 验证证书自动续期
echo "🔄 验证证书自动续期..."
sudo certbot renew --dry-run

echo ""
echo "✅ 配置完成！"
echo ""
echo "📋 下一步："
echo "1. 确保 EC2 安全组已开放端口 80 和 443"
echo "2. 访问 https://$DOMAIN 验证配置"
echo "3. 检查浏览器中的 SSL 证书"
echo ""
echo "🔗 访问地址："
echo "  - https://$DOMAIN"
echo "  - https://www.$DOMAIN"
echo ""

