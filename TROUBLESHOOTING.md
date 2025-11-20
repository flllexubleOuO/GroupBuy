# 故障排查指南

## 服务器内部错误（500 Error）

如果访问页面时出现 `{"error":"服务器内部错误"}`，请按以下步骤排查：

### 1. 检查 PM2 进程状态

SSH 连接到服务器：

```bash
ssh ec2-user@16.176.25.194
cd /home/ec2-user/tuangou-project
pm2 status
```

**预期结果**：应该看到 `group-buy-system` 状态为 `online`

### 2. 查看应用日志

```bash
# 查看最近的日志
pm2 logs group-buy-system --lines 50

# 或查看错误日志
pm2 logs group-buy-system --err --lines 50

# 实时查看日志
pm2 logs group-buy-system
```

**查找**：
- 错误堆栈信息
- 数据库连接错误
- 环境变量缺失
- 文件权限错误

### 3. 检查数据库

```bash
cd /home/ec2-user/tuangou-project

# 检查数据库文件是否存在
ls -la prisma/prod.db

# 检查数据库文件权限
ls -l prisma/prod.db

# 如果数据库不存在，需要运行迁移
npx prisma migrate deploy
```

### 4. 检查环境变量

```bash
# 检查 .env 文件
cat .env

# 验证环境变量是否正确加载
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL)"
```

**确保以下变量已配置**：
- `DATABASE_URL`
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_ADMIN_API_ACCESS_TOKEN`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

### 5. 检查文件权限

```bash
# 检查必要目录的权限
ls -la prisma/
ls -la public/uploads/
ls -la logs/

# 确保有写权限
chmod -R 755 prisma public/uploads logs
```

### 6. 重启服务

```bash
# 重启 PM2 进程
pm2 restart group-buy-system

# 查看状态
pm2 status

# 查看日志确认是否正常启动
pm2 logs group-buy-system --lines 20
```

### 7. 手动测试应用

```bash
# 进入项目目录
cd /home/ec2-user/tuangou-project

# 手动启动应用（用于调试）
NODE_ENV=production node dist/server.js
```

如果手动启动也有错误，会直接显示错误信息。

### 8. 检查端口占用

```bash
# 检查端口 3000 是否被占用
sudo ss -tulpn | grep 3000

# 或使用 netstat
sudo netstat -tulpn | grep 3000
```

### 9. 常见错误及解决方案

#### 错误 1: 数据库文件不存在

**症状**：日志显示 `ENOENT: no such file or directory`

**解决**：
```bash
cd /home/ec2-user/tuangou-project
mkdir -p prisma
npx prisma migrate deploy
```

#### 错误 2: 数据库权限错误

**症状**：日志显示 `EACCES: permission denied`

**解决**：
```bash
chmod 755 prisma
chmod 644 prisma/prod.db
```

#### 错误 3: Shopify API 调用失败

**症状**：日志显示 Shopify API 相关错误

**解决**：
- 检查 `SHOPIFY_STORE_DOMAIN` 是否正确
- 检查 `SHOPIFY_ADMIN_API_ACCESS_TOKEN` 是否有效
- 验证 API Token 权限

#### 错误 4: 模块未找到

**症状**：日志显示 `Cannot find module`

**解决**：
```bash
cd /home/ec2-user/tuangou-project
rm -rf node_modules dist
npm install
npm run build
pm2 restart group-buy-system
```

#### 错误 5: 端口已被占用

**症状**：日志显示 `EADDRINUSE: address already in use`

**解决**：
```bash
# 查找占用端口的进程
sudo lsof -i :3000

# 杀死进程（替换 PID）
sudo kill -9 PID

# 或重启 PM2
pm2 restart group-buy-system
```

### 10. 查看系统资源

```bash
# 检查内存使用
free -h

# 检查磁盘空间
df -h

# 检查 CPU 使用
top
```

### 11. 重新部署

如果以上方法都无法解决，尝试重新部署：

```bash
cd /home/ec2-user/tuangou-project
./deploy.sh
```

或在 GitHub Actions 中手动触发部署。

## 快速诊断命令

一键运行所有检查：

```bash
#!/bin/bash
echo "=== PM2 状态 ==="
pm2 status

echo ""
echo "=== 最近错误日志 ==="
pm2 logs group-buy-system --err --lines 20 --nostream

echo ""
echo "=== 数据库文件 ==="
ls -la prisma/prod.db 2>/dev/null || echo "数据库文件不存在"

echo ""
echo "=== 环境变量 ==="
cd /home/ec2-user/tuangou-project
grep -v '^#' .env | grep -v '^$' | head -5

echo ""
echo "=== 端口监听 ==="
sudo ss -tulpn | grep 3000 || echo "端口 3000 未监听"

echo ""
echo "=== 磁盘空间 ==="
df -h | grep -E '^/dev/'
```

保存为 `check.sh`，然后运行：
```bash
chmod +x check.sh
./check.sh
```

