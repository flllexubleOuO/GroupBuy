# 使用 Node.js LTS 版本
FROM node:20-slim

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production

# 生成 Prisma Client
RUN npx prisma generate

# 复制源代码
COPY . .

# 构建 TypeScript
RUN npm run build

# 创建必要的目录
RUN mkdir -p public/uploads logs

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]

