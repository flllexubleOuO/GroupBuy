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

# 清理旧的 node_modules（如果存在，确保全新安装）
echo "🧹 清理旧的依赖（如果存在）..."
if [ -d "node_modules" ]; then
  echo "删除旧的 node_modules..."
  rm -rf node_modules
fi

# 安装所有依赖（包括 devDependencies，用于构建）
echo "📦 安装依赖（包括开发依赖，用于构建）..."
echo "当前目录: $(pwd)"
echo "package.json 存在: $([ -f package.json ] && echo '是' || echo '否')"
echo "package-lock.json 存在: $([ -f package-lock.json ] && echo '是' || echo '否')"

# 确保安装所有依赖，包括 devDependencies
# 不使用 --production 标志，这样会安装 devDependencies
npm install --verbose

# 检查 npm install 是否成功
if [ $? -ne 0 ]; then
  echo "❌ npm install 失败"
  exit 1
fi

# 验证并确保 TypeScript 已安装
echo "🔍 验证 TypeScript 安装..."
echo "检查 TypeScript 包..."
if [ ! -d "node_modules/typescript" ]; then
  echo "⚠️  TypeScript 包不存在，显式安装..."
  npm install typescript@^5.3.3 --save-dev --force
  if [ $? -ne 0 ]; then
    echo "❌ TypeScript 安装失败"
    exit 1
  fi
fi

# 检查 tsc 可执行文件
echo "查找 tsc 可执行文件..."
TSC_PATH=""
if [ -f "node_modules/.bin/tsc" ]; then
  TSC_PATH="node_modules/.bin/tsc"
  echo "✅ 找到 tsc: $TSC_PATH"
elif [ -f "node_modules/typescript/bin/tsc" ]; then
  TSC_PATH="node_modules/typescript/bin/tsc"
  echo "✅ 找到 tsc: $TSC_PATH"
elif [ -f "node_modules/typescript/lib/tsc.js" ]; then
  # 使用 node 运行 tsc.js
  TSC_PATH="node node_modules/typescript/lib/tsc.js"
  echo "✅ 找到 tsc.js，将使用 node 运行"
else
  echo "❌ 找不到 TypeScript 编译器"
  echo "检查 node_modules/typescript 目录..."
  ls -la node_modules/typescript/ 2>/dev/null || echo "node_modules/typescript 不存在"
  echo "尝试重新安装 TypeScript..."
  rm -rf node_modules/typescript
  npm install typescript@^5.3.3 --save-dev --force
  if [ -f "node_modules/.bin/tsc" ]; then
    TSC_PATH="node_modules/.bin/tsc"
  elif [ -f "node_modules/typescript/bin/tsc" ]; then
    TSC_PATH="node_modules/typescript/bin/tsc"
  else
    echo "❌ TypeScript 安装后仍找不到 tsc"
    exit 1
  fi
fi

# 验证 TypeScript 版本
echo "验证 TypeScript 版本..."
if [ -f "node_modules/.bin/tsc" ]; then
  ./node_modules/.bin/tsc --version
elif [ -f "node_modules/typescript/bin/tsc" ]; then
  ./node_modules/typescript/bin/tsc --version
else
  node node_modules/typescript/lib/tsc.js --version
fi

# 生成 Prisma Client
echo "🔧 生成 Prisma Client..."
npx prisma generate

# 运行数据库迁移
echo "🗄️ 运行数据库迁移..."
npx prisma migrate deploy

# 构建项目
echo "🏗️ 构建项目..."
# 使用找到的 tsc 路径
if [ -f "node_modules/.bin/tsc" ]; then
  ./node_modules/.bin/tsc
elif [ -f "node_modules/typescript/bin/tsc" ]; then
  ./node_modules/typescript/bin/tsc
elif [ -f "node_modules/typescript/lib/tsc.js" ]; then
  node node_modules/typescript/lib/tsc.js
elif command -v tsc &> /dev/null; then
  tsc
else
  echo "❌ 找不到 TypeScript 编译器"
  echo "检查 node_modules 内容..."
  echo "node_modules/.bin/ 内容:"
  ls -la node_modules/.bin/ 2>/dev/null | head -20 || echo "node_modules/.bin/ 不存在"
  echo "node_modules/typescript/ 内容:"
  ls -la node_modules/typescript/ 2>/dev/null | head -20 || echo "node_modules/typescript/ 不存在"
  exit 1
fi

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

