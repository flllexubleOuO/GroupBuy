#!/bin/bash

# 检查 S3 配置脚本
# 在 EC2 上运行：bash check-s3-config.sh

echo "🔍 检查 S3 配置..."
echo ""

# 检查 .env 文件是否存在
if [ ! -f .env ]; then
    echo "❌ .env 文件不存在！"
    exit 1
fi

echo "✅ .env 文件存在"
echo ""

# 检查 S3 相关配置
echo "📋 S3 配置信息："
echo "----------------------------------------"
if grep -q "S3_ENABLED" .env; then
    S3_ENABLED=$(grep "^S3_ENABLED" .env | cut -d '=' -f2)
    echo "S3_ENABLED: $S3_ENABLED"
else
    echo "❌ S3_ENABLED 未配置（默认：false）"
fi

if grep -q "AWS_REGION\|S3_REGION" .env; then
    AWS_REGION=$(grep "^AWS_REGION\|^S3_REGION" .env | head -1 | cut -d '=' -f2)
    echo "AWS_REGION: $AWS_REGION"
else
    echo "⚠️  AWS_REGION 未配置"
fi

if grep -q "S3_BUCKET" .env; then
    S3_BUCKET=$(grep "^S3_BUCKET" .env | cut -d '=' -f2)
    echo "S3_BUCKET: $S3_BUCKET"
else
    echo "❌ S3_BUCKET 未配置"
fi

if grep -q "AWS_ACCESS_KEY_ID\|S3_ACCESS_KEY_ID" .env; then
    ACCESS_KEY=$(grep "^AWS_ACCESS_KEY_ID\|^S3_ACCESS_KEY_ID" .env | head -1 | cut -d '=' -f2)
    if [ -n "$ACCESS_KEY" ]; then
        echo "AWS_ACCESS_KEY_ID: ${ACCESS_KEY:0:10}...（已配置）"
    else
        echo "⚠️  AWS_ACCESS_KEY_ID 为空（如果使用 IAM 角色，可以不配置）"
    fi
else
    echo "⚠️  AWS_ACCESS_KEY_ID 未配置（如果使用 IAM 角色，可以不配置）"
fi

if grep -q "AWS_SECRET_ACCESS_KEY\|S3_SECRET_ACCESS_KEY" .env; then
    SECRET_KEY=$(grep "^AWS_SECRET_ACCESS_KEY\|^S3_SECRET_ACCESS_KEY" .env | head -1 | cut -d '=' -f2)
    if [ -n "$SECRET_KEY" ]; then
        echo "AWS_SECRET_ACCESS_KEY: ${SECRET_KEY:0:10}...（已配置）"
    else
        echo "⚠️  AWS_SECRET_ACCESS_KEY 为空（如果使用 IAM 角色，可以不配置）"
    fi
else
    echo "⚠️  AWS_SECRET_ACCESS_KEY 未配置（如果使用 IAM 角色，可以不配置）"
fi
echo "----------------------------------------"
echo ""

# 检查应用日志中的 S3 相关信息
echo "📋 检查应用日志中的 S3 相关信息..."
echo "----------------------------------------"
if command -v pm2 > /dev/null 2>&1; then
    pm2 logs group-buy-system --lines 100 --nostream 2>/dev/null | grep -i "s3\|aws" | tail -20 || echo "未找到 S3 相关日志"
else
    echo "⚠️  PM2 未安装，无法查看日志"
fi
echo "----------------------------------------"
echo ""

# 检查最近的订单
echo "💡 提示："
echo "1. 如果 S3_ENABLED=false 或未配置，请设置为 true"
echo "2. 确保 S3_BUCKET 已正确配置"
echo "3. 确保 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY 已配置（或使用 IAM 角色）"
echo "4. 配置完成后，需要重启应用：pm2 restart group-buy-system"
echo "5. 重新上传一张图片测试，新上传的图片应该使用 S3"

