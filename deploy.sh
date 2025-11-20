#!/bin/bash

# 部署脚本 - 用于在 EC2 上执行部署

set -e  # 遇到错误立即退出

echo "🚀 开始部署..."

# 注意：代码已经通过 rsync 同步，不需要 git pull

# 检查环境变量
echo "🔍 检查环境变量..."
if [ ! -f .env ]; then
  echo "⚠️  .env 文件不存在，创建默认配置..."
  cat > .env << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL="file:./prisma/prod.db"
EOF
  echo "✅ 已创建默认 .env 文件"
else
  echo "✅ .env 文件存在"
  # 确保 DATABASE_URL 存在
  if ! grep -q "DATABASE_URL" .env; then
    echo "⚠️  DATABASE_URL 未配置，添加默认值..."
    echo 'DATABASE_URL="file:./prisma/prod.db"' >> .env
  fi
fi

# 加载环境变量
export $(cat .env | grep -v '^#' | xargs)

# 安装所有依赖（包括 devDependencies，用于构建）
echo "📦 安装依赖（包括开发依赖，用于构建）..."
npm install

# 验证 TypeScript 安装
echo "🔍 验证 TypeScript 安装..."
if ! npx tsc --version; then
  echo "❌ TypeScript 未正确安装，尝试重新安装..."
  npm install typescript --save-dev
fi

# 生成 Prisma Client
echo "🔧 生成 Prisma Client..."
npx prisma generate

# 运行数据库迁移
echo "🗄️ 运行数据库迁移..."
npx prisma migrate deploy

# 构建项目
echo "🏗️ 构建项目..."
npm run build

# 清理开发依赖（可选，节省空间）
# 注意：如果后续需要重新构建，需要重新安装 devDependencies
# echo "🧹 清理开发依赖..."
# npm prune --production

# 重启 PM2 进程
echo "🔄 重启应用..."
pm2 restart group-buy-system || pm2 start ecosystem.config.js --env production

# 显示状态
pm2 status

echo "✅ 部署完成！"

