#!/bin/bash

# 快速诊断脚本 - 检查服务状态和错误
# 运行：bash scripts/check-service.sh

echo "=========================================="
echo "服务诊断脚本"
echo "=========================================="
echo ""

echo "1. PM2 进程状态:"
pm2 status
echo ""

echo "2. 最近的应用日志（最后 30 行）:"
pm2 logs group-buy-system --lines 30 --nostream
echo ""

echo "3. 最近的错误日志:"
pm2 logs group-buy-system --err --lines 20 --nostream
echo ""

echo "4. 数据库文件检查:"
if [ -f "prisma/prod.db" ]; then
  echo "✅ 数据库文件存在"
  ls -lh prisma/prod.db
else
  echo "❌ 数据库文件不存在"
fi
echo ""

echo "5. 环境变量检查:"
if [ -f ".env" ]; then
  echo "✅ .env 文件存在"
  echo "DATABASE_URL: $(grep DATABASE_URL .env | head -1)"
  echo "SHOPIFY_STORE_DOMAIN: $(grep SHOPIFY_STORE_DOMAIN .env | head -1)"
else
  echo "❌ .env 文件不存在"
fi
echo ""

echo "6. 端口监听检查:"
if command -v ss &> /dev/null; then
  sudo ss -tulpn | grep 3000 || echo "端口 3000 未监听"
else
  sudo netstat -tulpn | grep 3000 || echo "端口 3000 未监听"
fi
echo ""

echo "7. 文件权限检查:"
ls -ld prisma public/uploads logs 2>/dev/null
echo ""

echo "8. 磁盘空间:"
df -h | grep -E '^/dev/' | head -3
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""

