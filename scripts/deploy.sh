#!/bin/bash

# 部署脚本 - 用于在 EC2 上执行部署
# 运行：bash scripts/deploy.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署..."

# 注意：代码已经通过 rsync 同步，不需要 git pull

# 获取当前工作目录的绝对路径
DEPLOY_DIR=$(pwd)
echo "📂 当前部署目录: $DEPLOY_DIR"

# 检查环境变量
echo "🔍 检查环境变量..."
if [ ! -f .env ]; then
  echo "⚠️  .env 文件不存在，创建默认配置..."
  # 使用绝对路径，避免相对路径解析问题
  cat > .env << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL="file:${DEPLOY_DIR}/prisma/prod.db"
EOF
  echo "✅ 已创建默认 .env 文件"
  echo "   数据库路径: ${DEPLOY_DIR}/prisma/prod.db"
else
  echo "✅ .env 文件存在"
  # 检查并修复 DATABASE_URL（如果使用相对路径）
  if grep -q "DATABASE_URL" .env; then
    # 如果 DATABASE_URL 使用相对路径，更新为绝对路径
    if grep -q 'DATABASE_URL="file:\./prisma' .env || grep -q "DATABASE_URL=file:\./prisma" .env; then
      echo "⚠️  检测到相对路径，更新为绝对路径..."
      # 备份原文件
      cp .env .env.backup
      # 更新为绝对路径
      sed -i.bak "s|DATABASE_URL=\"file:\./prisma|DATABASE_URL=\"file:${DEPLOY_DIR}/prisma|g" .env
      sed -i.bak "s|DATABASE_URL=file:\./prisma|DATABASE_URL=\"file:${DEPLOY_DIR}/prisma|g" .env
      rm -f .env.bak
      echo "✅ 已更新 DATABASE_URL 为绝对路径"
    fi
  else
    echo "⚠️  DATABASE_URL 未配置，添加默认值..."
    echo "DATABASE_URL=\"file:${DEPLOY_DIR}/prisma/prod.db\"" >> .env
  fi
fi

# 显示最终的 DATABASE_URL
echo "📊 当前 DATABASE_URL 配置:"
grep DATABASE_URL .env || echo "未找到 DATABASE_URL"

# 加载环境变量（但暂时不设置 NODE_ENV，避免影响 npm install）
ENV_VARS=$(cat .env | grep -v '^#' | grep -v '^NODE_ENV' | xargs)
export $ENV_VARS

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

# 临时取消 NODE_ENV，确保安装 devDependencies
# npm install 在 NODE_ENV=production 时会跳过 devDependencies
OLD_NODE_ENV=$NODE_ENV
unset NODE_ENV

# 确保安装所有依赖，包括 devDependencies
# 不使用 --production 标志，这样会安装 devDependencies
npm install --verbose

# 恢复 NODE_ENV（如果需要）
if [ -n "$OLD_NODE_ENV" ]; then
  export NODE_ENV=$OLD_NODE_ENV
fi

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
  # 临时取消 NODE_ENV 确保安装 devDependencies
  unset NODE_ENV
  npm install typescript@^5.3.3 --save-dev --force
  export NODE_ENV=$OLD_NODE_ENV
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
  echo "检查 node_modules 目录..."
  ls -la node_modules/ | head -20
  echo "尝试重新安装 TypeScript..."
  rm -rf node_modules/typescript
  # 临时取消 NODE_ENV 确保安装 devDependencies
  unset NODE_ENV
  npm install typescript@^5.3.3 --save-dev --force
  export NODE_ENV=$OLD_NODE_ENV
  if [ -f "node_modules/.bin/tsc" ]; then
    TSC_PATH="node_modules/.bin/tsc"
  elif [ -f "node_modules/typescript/bin/tsc" ]; then
    TSC_PATH="node_modules/typescript/bin/tsc"
  else
    echo "❌ TypeScript 安装后仍找不到 tsc"
    echo "检查安装后的 node_modules/typescript..."
    ls -la node_modules/typescript/ 2>/dev/null || echo "仍然不存在"
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

# 重新加载环境变量（确保使用更新后的 DATABASE_URL）
echo "🔄 重新加载环境变量..."
if [ -f .env ]; then
  # 使用 source 或 export 加载环境变量
  set -a
  source .env 2>/dev/null || . .env 2>/dev/null || true
  set +a
  # 或者直接导出 DATABASE_URL
  export DATABASE_URL=$(grep "^DATABASE_URL" .env | cut -d '=' -f2- | sed 's/^"//' | sed 's/"$//' | sed "s|^file:\./|file:${DEPLOY_DIR}/|")
fi

# 确保数据库目录存在
echo "📁 确保数据库目录存在..."
mkdir -p prisma
chmod 755 prisma

# 显示数据库配置信息
echo "📊 数据库配置信息:"
echo "  当前工作目录: $(pwd)"
echo "  部署目录: $DEPLOY_DIR"
echo "  DATABASE_URL: $DATABASE_URL"

# 从 DATABASE_URL 提取实际文件路径并验证
DB_PATH=$(echo $DATABASE_URL | sed 's|file:||' | sed 's|"||g')
echo "  数据库文件路径: $DB_PATH"
if [[ "$DB_PATH" == *"/prisma/prisma/"* ]]; then
  echo "  ⚠️  警告：检测到路径重复（/prisma/prisma/），这可能导致问题"
  # 修复路径
  FIXED_PATH=$(echo $DB_PATH | sed 's|/prisma/prisma/|/prisma/|')
  echo "  修复后的路径: $FIXED_PATH"
  export DATABASE_URL="file:${FIXED_PATH}"
  # 更新 .env 文件
  sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"file:${FIXED_PATH}\"|g" .env
  rm -f .env.bak
  echo "  ✅ 已修复 DATABASE_URL"
fi

# 检查迁移文件是否存在
echo "🔍 检查迁移文件..."
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "✅ 迁移文件存在"
  ls -la prisma/migrations/ | head -10
else
  echo "⚠️  迁移文件目录不存在或为空"
fi

# 生成 Prisma Client
echo "🔧 生成 Prisma Client..."
npx prisma generate

# 运行数据库迁移
echo "🗄️ 运行数据库迁移..."
echo "当前工作目录: $(pwd)"
echo "DATABASE_URL: $DATABASE_URL"

# 确保数据库文件目录存在
DB_DIR=$(dirname "$DB_PATH")
mkdir -p "$DB_DIR"
echo "✅ 数据库目录已确保存在: $DB_DIR"

# 检查数据库文件是否存在
if [ ! -f "$DB_PATH" ]; then
  echo "⚠️  数据库文件不存在，将创建新数据库: $DB_PATH"
  # 创建空的数据库文件
  touch "$DB_PATH"
  chmod 644 "$DB_PATH"
  echo "✅ 已创建数据库文件"
fi

# 首先尝试使用 db push 确保 schema 同步（更可靠）
echo "🔄 使用 db push 同步数据库 schema..."
npx prisma db push --accept-data-loss --skip-generate 2>&1 | tee /tmp/dbpush.log
DB_PUSH_EXIT=${PIPESTATUS[0]}

if [ $DB_PUSH_EXIT -eq 0 ]; then
  echo "✅ db push 成功，schema 已同步"
else
  echo "⚠️  db push 失败 (退出码: $DB_PUSH_EXIT)"
  echo "db push 日志:"
  cat /tmp/dbpush.log
fi

# 然后运行 migrate deploy 来应用迁移历史（如果有）
echo "🔄 运行 migrate deploy 应用迁移历史..."
npx prisma migrate deploy 2>&1 | tee /tmp/migrate.log
MIGRATE_EXIT_CODE=${PIPESTATUS[0]}

if [ $MIGRATE_EXIT_CODE -ne 0 ]; then
  echo "⚠️  migrate deploy 失败 (退出码: $MIGRATE_EXIT_CODE)"
  echo "迁移日志:"
  cat /tmp/migrate.log
  
  # 如果 migrate deploy 失败，但 db push 成功，继续部署
  if [ $DB_PUSH_EXIT -eq 0 ]; then
    echo "✅ 虽然 migrate deploy 失败，但 db push 已成功同步 schema，继续部署..."
  else
    echo "❌ 数据库迁移和 schema 同步都失败"
    exit 1
  fi
else
  echo "✅ 数据库迁移成功"
fi

# 验证迁移结果 - 使用 Prisma 验证表是否存在
echo "🔍 验证数据库表是否存在..."
# 创建一个临时验证脚本（在项目根目录）
cat > ./verify_db_temp.js << 'VERIFY_EOF'
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    // 尝试查询 Package 表
    await prisma.package.findMany({ take: 1 });
    console.log('✅ Package 表存在且可访问');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('does not exist') || error.message.includes('no such table')) {
      console.error('❌ Package 表不存在！');
      process.exit(1);
    } else {
      console.error('⚠️  验证时出现错误:', error.message);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}
verify();
VERIFY_EOF

# 运行验证脚本
node ./verify_db_temp.js
VERIFY_EXIT=$?

if [ $VERIFY_EXIT -ne 0 ]; then
  echo "❌ 数据库表验证失败，强制使用 db push 重新创建..."
  npx prisma db push --force-reset --accept-data-loss --skip-generate
  if [ $? -eq 0 ]; then
    echo "✅ 强制 db push 成功，重新验证..."
    node ./verify_db_temp.js
    if [ $? -eq 0 ]; then
      echo "✅ 数据库表验证通过"
    else
      echo "❌ 强制 db push 后验证仍然失败"
      exit 1
    fi
  else
    echo "❌ 强制 db push 失败"
    exit 1
  fi
else
  echo "✅ 数据库表验证通过"
fi

# 清理临时文件
rm -f ./verify_db_temp.js

# 构建项目
echo "🏗️ 构建项目..."
npm run build

# 确保视图文件已复制
echo "📁 检查视图文件..."
if [ ! -d "dist/views" ]; then
  echo "⚠️ 视图目录不存在，手动复制..."
  mkdir -p dist/views
  cp -r src/views/* dist/views/
  echo "✅ 视图文件已复制"
else
  echo "✅ 视图目录已存在"
fi

# 确保 public 目录存在（静态文件）
echo "📁 检查 public 目录..."
if [ ! -d "public" ]; then
  echo "❌ 警告：public 目录不存在！"
else
  echo "✅ public 目录存在"
  echo "public 目录内容:"
  ls -lah public/ | head -10
  if [ -d "public/images" ]; then
    echo "✅ public/images 目录存在"
    echo "图片文件:"
    ls -lah public/images/ || echo "图片目录为空"
  else
    echo "⚠️  public/images 目录不存在"
  fi
fi

# 清理开发依赖（可选，节省空间）
# 注意：如果后续需要重新构建，需要重新安装 devDependencies
# echo "🧹 清理开发依赖..."
# npm prune --production

# 重启或启动 PM2 进程
echo "🔄 启动/重启应用..."
if pm2 list | grep -q "group-buy-system"; then
  echo "应用已在运行，执行重启..."
  pm2 restart group-buy-system --update-env
else
  echo "应用未运行，启动新实例..."
  pm2 start ecosystem.config.js --env production
  # 保存 PM2 配置，确保开机自启
  pm2 save
fi

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 3

# 显示状态
echo "📊 PM2 进程状态:"
pm2 status

# 验证服务是否正常运行
echo "🔍 验证服务状态..."
if pm2 list | grep -q "group-buy-system.*online"; then
  echo "✅ 服务运行正常"
  # 显示应用信息
  pm2 info group-buy-system
else
  echo "⚠️  服务可能未正常启动，检查日志..."
  pm2 logs group-buy-system --lines 20 --nostream
  exit 1
fi

echo "✅ 部署完成！"

