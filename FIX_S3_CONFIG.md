# 修复 S3 配置

## 问题发现

您的 `.env` 文件中有一个拼写错误：
- ❌ `S3_ENABLED=ture` （错误）
- ✅ `S3_ENABLED=true` （正确）

## 修复步骤

### 1. 在 EC2 上编辑 .env 文件

```bash
cd ~/tuangou-project
nano .env
```

### 2. 修改以下内容

将：
```bash
S3_ENABLED=ture
```

改为：
```bash
S3_ENABLED=true
```

### 3. 添加 AWS 访问凭证（如果使用 IAM 用户）

如果您使用的是 IAM 用户访问密钥，需要添加：

```bash
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

如果您使用的是 IAM 角色（附加到 EC2 实例），可以不需要这两行。

### 4. 完整的 .env 配置示例

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL="file:/home/ec2-user/tuangou-project/prisma/prod.db"

# S3 配置
S3_ENABLED=true
AWS_REGION=ap-southeast-1
S3_BUCKET=transfer-upload-bin

# 如果使用 IAM 用户，添加以下两行：
# AWS_ACCESS_KEY_ID=your-access-key-id
# AWS_SECRET_ACCESS_KEY=your-secret-access-key

# 如果使用 IAM 角色，可以不配置上面两行
```

### 5. 保存并重启应用

```bash
# 保存文件（在 nano 中：Ctrl+O, Enter, Ctrl+X）

# 重启应用使配置生效
pm2 restart group-buy-system

# 查看日志确认
pm2 logs group-buy-system --lines 50
```

### 6. 测试上传

1. 访问订单页面
2. 上传一张新的付款截图
3. 查看订单详情中的图片 URL
4. 如果配置正确，URL 应该是 `/api/images/s3/uploads/xxx.jpg` 格式

## 验证 S3 是否正常工作

运行以下命令检查日志：

```bash
pm2 logs group-buy-system --lines 100 | grep -i "s3\|upload"
```

如果看到 "S3 上传失败" 的错误信息，需要检查：
1. AWS 访问凭证是否正确
2. S3 存储桶名称是否正确
3. AWS 区域是否正确
4. IAM 用户/角色是否有 S3 访问权限

