# GitHub 仓库设置指南

## 步骤 1: 在 GitHub 上创建新仓库

1. 登录 GitHub 账号
2. 点击右上角的 "+" 号，选择 "New repository"
3. 填写仓库信息：
   - **Repository name**: `tuangou-project` (或您喜欢的名称)
   - **Description**: `WeChat Group Buying System with Shopify Integration`
   - **Visibility**: 选择 Public 或 Private
   - **不要**勾选 "Initialize this repository with a README"（因为我们已经有了）
4. 点击 "Create repository"

## 步骤 2: 连接本地仓库到 GitHub

在终端中执行以下命令（将 `YOUR_USERNAME` 和 `YOUR_REPO_NAME` 替换为您的实际信息）：

```bash
# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 或者使用 SSH（如果您配置了 SSH key）
# git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git

# 查看远程仓库配置
git remote -v
```

## 步骤 3: 推送代码到 GitHub

```bash
# 推送主分支到 GitHub
git branch -M main
git push -u origin main
```

如果遇到认证问题，您可能需要：
- 使用 Personal Access Token（推荐）
- 或配置 SSH key

## 步骤 4: 验证推送

推送成功后，访问您的 GitHub 仓库页面，应该能看到所有项目文件。

## 后续更新代码

当您修改代码后，使用以下命令更新 GitHub：

```bash
# 查看修改的文件
git status

# 添加所有修改
git add .

# 提交修改
git commit -m "描述您的修改内容"

# 推送到 GitHub
git push
```

## 注意事项

1. **敏感信息**: `.env` 文件已被 `.gitignore` 忽略，不会上传到 GitHub
2. **数据库文件**: `*.db` 文件已被忽略
3. **上传文件**: `public/uploads/*` 已被忽略
4. **依赖包**: `node_modules/` 已被忽略

## 创建 Personal Access Token（如果需要）

如果使用 HTTPS 推送时遇到认证问题：

1. 访问 GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 点击 "Generate new token (classic)"
3. 设置权限：至少勾选 `repo` 权限
4. 生成后复制 token
5. 推送时使用 token 作为密码

