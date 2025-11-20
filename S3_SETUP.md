# S3 存储配置指南

本指南将帮助您配置 AWS S3 来存储用户上传的付款截图。

## 功能说明

系统现在支持两种存储方式：
1. **本地存储**（默认）：文件存储在服务器的 `public/uploads` 目录
2. **S3 存储**（可选）：文件存储在 AWS S3 中

## 配置步骤

### 1. 创建 AWS S3 存储桶

1. 登录 AWS 控制台
2. 进入 S3 服务
3. 点击"创建存储桶"
4. 配置存储桶：
   - **存储桶名称**：例如 `your-group-buy-uploads`
   - **AWS 区域**：选择离您最近的区域，例如 `ap-southeast-1`（新加坡）
   - **阻止公共访问设置**：
     - 如果希望文件公开访问，取消勾选"阻止所有公共访问"
     - 如果希望文件私有，保持默认设置（需要配置 IAM 权限）
5. 创建存储桶

### 2. 配置存储桶权限（如果使用公共访问）

如果希望文件可以直接通过 URL 访问，需要配置存储桶策略：

1. 进入存储桶 → **权限** → **存储桶策略**
2. 添加以下策略（替换 `your-bucket-name` 为您的存储桶名称）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### 3. 创建 IAM 用户和访问密钥

1. 进入 AWS IAM 控制台
2. 创建新用户（例如 `s3-upload-user`）
3. 附加策略：`AmazonS3FullAccess`（或创建自定义策略，仅允许上传到特定存储桶）
4. 创建访问密钥：
   - 进入用户 → **安全凭证** → **创建访问密钥**
   - 选择"应用程序运行在 AWS 外部"
   - 保存 **访问密钥 ID** 和 **秘密访问密钥**（只显示一次，请妥善保存）

### 4. 配置环境变量

在 EC2 服务器的 `.env` 文件中添加以下配置：

```bash
# S3 配置
S3_ENABLED=true
AWS_REGION=ap-southeast-1  # 替换为您的 S3 区域
S3_BUCKET=your-bucket-name  # 替换为您的存储桶名称
AWS_ACCESS_KEY_ID=your-access-key-id  # 替换为您的访问密钥 ID
AWS_SECRET_ACCESS_KEY=your-secret-access-key  # 替换为您的秘密访问密钥

# 可选配置
S3_FOLDER_PREFIX=uploads  # S3 中的文件夹前缀（默认：uploads）
S3_PUBLIC_URL=  # 可选：如果使用 CloudFront，填写 CloudFront URL
```

### 5. 部署更新

1. 将代码推送到 Git 仓库
2. 在 EC2 上运行部署脚本：
   ```bash
   ./deploy.sh
   ```
   
   部署脚本会自动：
   - 安装新的依赖（`@aws-sdk/client-s3` 和 `@aws-sdk/s3-request-presigner`）
   - 构建项目
   - 重启服务

## 环境变量说明

| 变量名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| `S3_ENABLED` | 是 | 是否启用 S3 存储 | `true` |
| `AWS_REGION` 或 `S3_REGION` | 是 | AWS 区域 | `ap-southeast-1` |
| `S3_BUCKET` | 是 | S3 存储桶名称 | `my-uploads-bucket` |
| `AWS_ACCESS_KEY_ID` 或 `S3_ACCESS_KEY_ID` | 是 | AWS 访问密钥 ID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` 或 `S3_SECRET_ACCESS_KEY` | 是 | AWS 秘密访问密钥 | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `S3_FOLDER_PREFIX` | 否 | S3 中的文件夹前缀 | `uploads`（默认） |
| `S3_PUBLIC_URL` | 否 | 自定义公共 URL（如 CloudFront） | `https://d1234567890.cloudfront.net` |

## 切换回本地存储

如果不想使用 S3，只需在 `.env` 文件中设置：

```bash
S3_ENABLED=false
```

或者删除所有 S3 相关的环境变量，系统会自动使用本地存储。

## 验证配置

部署后，可以通过以下方式验证：

1. **查看日志**：
   ```bash
   pm2 logs group-buy-system
   ```

2. **测试上传**：
   - 访问订单页面
   - 上传一张付款截图
   - 检查订单详情中的截图 URL
   - 如果配置正确，URL 应该是 S3 的 URL（例如：`https://your-bucket.s3.region.amazonaws.com/uploads/xxx.jpg`）

## 常见问题

### 1. 上传失败：Access Denied

**原因**：IAM 用户权限不足或存储桶策略配置错误

**解决**：
- 检查 IAM 用户是否有 `s3:PutObject` 权限
- 检查存储桶策略是否正确配置

### 2. 文件无法访问：403 Forbidden

**原因**：存储桶阻止了公共访问，但文件需要公开访问

**解决**：
- 配置存储桶策略允许公共读取（见步骤 2）
- 或者使用预签名 URL（需要修改代码）

### 3. 区域不匹配错误

**原因**：`AWS_REGION` 配置与存储桶实际区域不一致

**解决**：
- 检查存储桶的实际区域
- 更新 `.env` 中的 `AWS_REGION` 配置

## 安全建议

1. **最小权限原则**：为 IAM 用户只授予必要的 S3 权限
2. **使用 IAM 角色**：如果应用运行在 EC2 上，考虑使用 IAM 角色而不是访问密钥
3. **定期轮换密钥**：定期更新访问密钥
4. **使用 CloudFront**：如果需要更好的性能和安全性，可以配置 CloudFront CDN

## 成本估算

S3 存储成本通常很低：
- **存储费用**：约 $0.023/GB/月（标准存储）
- **请求费用**：
  - PUT 请求：$0.005/1000 次
  - GET 请求：$0.0004/1000 次
- **数据传输**：前 100GB/月免费（出站）

对于小型应用，每月成本通常不到 $1。

