# 工具脚本（scripts）

本目录用于存放**非业务代码**的辅助脚本（排查/测试/运维小工具），避免污染项目根目录。

## S3 相关

- `test-s3-connection.js`：测试 S3 连接、桶可访问性及上传权限
  - 运行：`node scripts/test-s3-connection.js`
- `test-upload-simple.js`：最小化上传/删除测试（快速验证 PutObject）
  - 运行：`node scripts/test-upload-simple.js`
- `fix-s3-region.js`：检查桶实际 Region，并提示如何修正 `.env` 的 `AWS_REGION`
  - 运行：`node scripts/fix-s3-region.js`

## 运维/排查

- `check-s3-config.sh`：检查 `.env` 的 S3 配置，并从 PM2 日志里筛查 S3/AWS 关键字
  - 运行：`bash scripts/check-s3-config.sh`
- `check-service.sh`：PM2/日志/端口/权限/磁盘空间快速诊断
  - 运行：`bash scripts/check-service.sh`
- `check-images.sh`：检查 `public/images/share-card.png` 是否存在以及是否被 Git 追踪
  - 运行：`bash scripts/check-images.sh`

## 部署/域名

- `deploy.sh`：EC2 上的部署脚本（依赖已同步代码，负责安装依赖、迁移、构建、PM2 重启）
  - 运行：`bash scripts/deploy.sh`
- `setup-domain-https.sh`：安装/配置 Nginx + Certbot 并签发证书
  - 运行：`bash scripts/setup-domain-https.sh your-domain.com`
