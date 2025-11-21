# 微信分享卡片配置指南

本指南说明如何配置微信分享链接，使其在微信群中显示为美观的卡片形式。

## 📋 已完成的配置

### 1. Meta 标签已添加

已在 `src/views/public/order.ejs` 中添加了以下 meta 标签：

- ✅ Open Graph 标签（通用社交分享）
- ✅ 微信特定标签（`weixin:` 前缀）
- ✅ Twitter Card 标签
- ✅ 基础 SEO 标签

### 2. 动态 URL 支持

已更新 `src/app.ts`，自动传递 `baseUrl` 给模板，确保分享链接使用正确的域名。

### 3. 动态分享内容（新功能 ✨）

现在支持根据套餐动态生成分享内容：

- ✅ **通用分享**：分享 `/order` 显示默认的团购页面信息
- ✅ **套餐分享**：分享 `/order?packageId=xxx` 显示特定套餐的详细信息
  - 自动使用套餐名称作为标题
  - 显示套餐描述、价格、优惠信息
  - 自动使用套餐图片（如果有）
  - 显示配送大区信息

### 4. 前端分享功能

每个套餐卡片上都有"分享"按钮，点击后：
- 在支持的设备上会调用系统分享功能
- 否则自动复制带套餐ID的链接到剪贴板
- 用户可以在微信中粘贴并分享，会显示该套餐的专属卡片

## 🖼️ 创建分享卡片图片

### 步骤 1: 准备分享图片

分享卡片需要一张图片，建议规格：
- **尺寸**: 1200 x 630 像素（推荐）
- **格式**: JPG 或 PNG
- **大小**: 小于 300KB（微信限制）
- **内容**: 包含您的品牌、标题、简要描述

### 步骤 2: 上传图片到服务器

在服务器上创建图片目录并上传：

```bash
# SSH 到服务器
ssh ec2-user@您的EC2-IP

# 创建图片目录
cd /home/ec2-user/tuangou-project
mkdir -p public/images

# 上传您的分享图片（使用 scp 或其他方式）
# 图片命名为: share-card.jpg
```

或者通过 GitHub Actions 部署时自动同步：
- 将图片放在项目的 `public/images/` 目录
- 命名为 `share-card.jpg` 或 `share-card.png`

### 步骤 3: 验证图片可访问

确保图片可以通过以下 URL 访问：
```
http://您的域名:3000/images/share-card.jpg
```

## ⚙️ 自定义分享内容

### 修改分享标题和描述

编辑 `src/views/public/order.ejs`，找到以下部分并修改：

```html
<!-- 修改这些内容 -->
<meta property="og:title" content="您的标题">
<meta property="og:description" content="您的描述">
<meta name="weixin:title" content="您的标题">
<meta name="weixin:description" content="您的描述">
```

### 动态分享内容（已实现 ✨）

系统已自动支持根据套餐动态生成分享内容：

1. **通用分享链接**：
   ```
   https://您的域名/order
   ```
   显示默认的团购页面信息

2. **套餐专属分享链接**：
   ```
   https://您的域名/order?packageId=套餐ID
   ```
   自动显示该套餐的：
   - 套餐名称作为标题
   - 套餐描述
   - 价格和优惠信息（如果有原价）
   - 配送大区信息
   - 套餐图片（如果有）

3. **如何使用**：
   - 在套餐卡片上点击"分享"按钮
   - 系统会自动生成带套餐ID的链接
   - 复制链接并在微信中分享即可

### 自定义分享内容

如果需要修改默认分享文案，编辑 `src/app.ts` 中的默认分享数据：

```typescript
let shareData = {
  title: '团购下单 - 超值优惠商品',  // 修改这里
  description: '优质团购商品，超值优惠价格，快速配送服务。精选好物，限时优惠，立即下单享受团购价！',  // 修改这里
  image: `${baseUrl}/images/share-card.jpg`,
  url: `${baseUrl}/order`,
};
```

## 🧪 测试微信分享

### 方法 1: 使用微信开发者工具

1. 打开 [微信公众平台](https://mp.weixin.qq.com/)
2. 使用开发者工具测试分享效果
3. 输入您的 URL 查看预览

### 方法 2: 使用在线工具

使用以下工具测试 Open Graph 标签：

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

### 方法 3: 实际测试

1. 在微信中打开您的链接
2. 点击右上角 "..." 菜单
3. 选择 "发送给朋友" 或 "分享到朋友圈"
4. 查看分享卡片效果

## 📝 微信分享标签说明

### 必需的标签

```html
<!-- 标题 -->
<meta name="weixin:title" content="您的标题">

<!-- 描述 -->
<meta name="weixin:description" content="您的描述">

<!-- 图片（必需，否则可能不显示卡片） -->
<meta name="weixin:image" content="图片URL">
```

### 推荐的标签

```html
<!-- 卡片类型 -->
<meta name="weixin:card" content="summary_large_image">
<!-- 可选值: summary, summary_large_image -->
```

### Open Graph 标签（微信也会读取）

```html
<meta property="og:title" content="标题">
<meta property="og:description" content="描述">
<meta property="og:image" content="图片URL">
<meta property="og:url" content="页面URL">
<meta property="og:type" content="website">
```

## 🔧 常见问题

### Q1: 分享后不显示卡片

**可能原因**：
1. 图片 URL 无法访问（必须是公网可访问的 URL）
2. 图片尺寸不符合要求
3. 图片大小超过限制
4. Meta 标签格式错误

**解决方案**：
1. 确保图片可以通过浏览器直接访问
2. 检查图片尺寸和大小
3. 使用微信开发者工具调试
4. 清除微信缓存后重试

### Q2: 图片显示不正确

**可能原因**：
1. 图片 URL 使用了相对路径
2. 图片服务器不允许外部访问
3. 图片格式不支持

**解决方案**：
1. 使用完整的绝对 URL（包含 http:// 或 https://）
2. 确保图片服务器允许跨域访问
3. 使用 JPG 或 PNG 格式

### Q3: 标题和描述不更新

**可能原因**：
微信缓存了旧的分享信息

**解决方案**：
1. 等待 24 小时让缓存过期
2. 或使用微信开发者工具清除缓存
3. 修改 URL 参数（如添加 `?v=2`）强制刷新

### Q4: 分享卡片样式不理想

**优化建议**：
1. **图片设计**：
   - 使用清晰的品牌标识
   - 包含主要卖点
   - 文字要清晰易读
   - 使用对比度高的颜色

2. **标题和描述**：
   - 标题：10-20 字，简洁有力
   - 描述：20-50 字，突出价值

## 📐 分享图片设计建议

### 尺寸规范

- **推荐**: 1200 x 630 像素
- **最小**: 300 x 300 像素
- **最大**: 不超过 5MB

### 设计要点

1. **品牌标识**: 左上角或中央放置 Logo
2. **主标题**: 大号字体，清晰醒目
3. **副标题/描述**: 中等字体，补充信息
4. **视觉元素**: 使用图标、插图增强视觉效果
5. **配色**: 与品牌一致，对比度高

### 工具推荐

- **Canva**: https://www.canva.com/ （有微信分享模板）
- **Figma**: 专业设计工具
- **Photoshop**: 专业图像处理

## 🚀 快速开始

1. **准备分享图片**（1200x630px，JPG/PNG）
2. **上传到服务器**：
   ```bash
   # 在项目目录
   mkdir -p public/images
   # 上传图片为 public/images/share-card.jpg
   ```
3. **推送到 GitHub**（如果使用自动部署）
4. **测试分享效果**

## 📚 相关资源

- [微信开放平台文档](https://developers.weixin.qq.com/doc/)
- [Open Graph 协议](https://ogp.me/)
- [微信分享最佳实践](https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/JS-SDK.html)

