#!/bin/bash
# 快速检查图片文件是否存在的脚本

echo "🔍 检查图片文件..."
echo ""

# 检查本地文件
echo "📂 本地文件:"
if [ -f "public/images/share-card.png" ]; then
    echo "✅ 本地文件存在: public/images/share-card.png"
    ls -lh public/images/share-card.png
else
    echo "❌ 本地文件不存在: public/images/share-card.png"
fi

echo ""
echo "📦 Git 状态:"
git ls-files public/images/share-card.png 2>/dev/null && echo "✅ 文件已提交到 Git" || echo "❌ 文件未提交到 Git"

echo ""
echo "🌐 如果已部署，请检查服务器上的文件:"
echo "   ssh ec2-user@您的服务器IP"
echo "   cd /home/ec2-user/tuangou-project"
echo "   ls -lh public/images/share-card.png"

