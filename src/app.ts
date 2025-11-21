import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import path from 'path';
import multer from 'multer';
import routes from './routes';
import { config } from './config';

const app = express();

// 视图引擎配置
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session 配置
app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      // 只有在使用 HTTPS 时才设置 secure
      // 如果使用 HTTP，secure 必须为 false，否则 cookie 不会被保存
      secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax', // 防止 CSRF 攻击
    },
  })
);

// 路由
app.use(routes);

// 前台下单页面
app.get('/order', async (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const packageId = req.query.packageId as string | undefined;
  
  // 默认分享内容
  let shareData = {
    title: 'BAIJIAGROCERIES - 优质商品，超值价格',
    description: 'GOOD PRODUCT! GOOD PRICE! 精选优质商品，超值团购价格。纸巾、手套等生活用品，品质保证，价格优惠！',
    image: `${baseUrl}/images/share-card.png`,
    url: `${baseUrl}/order`,
  };
  
  // 如果指定了套餐ID，获取套餐信息用于分享
  if (packageId) {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const pkg = await prisma.package.findUnique({
        where: { id: packageId },
      });
      
      if (pkg && pkg.isActive) {
        // 构建套餐分享内容
        let description = pkg.description || '精选优质商品组合，超值团购价格';
        
        // 如果有原价，添加优惠信息
        if (pkg.originalPrice) {
          const originalPrice = parseFloat(pkg.originalPrice);
          const price = parseFloat(pkg.price);
          const savings = originalPrice - price;
          description = `${description} | 原价$${originalPrice.toFixed(2)}，团购价$${price.toFixed(2)}，节省$${savings.toFixed(2)}`;
        } else {
          description = `${description} | 团购价$${parseFloat(pkg.price).toFixed(2)}`;
        }
        
        // 如果有大区信息，添加到描述
        if (pkg.region) {
          description = `${description} | ${pkg.region}配送`;
        }
        
        shareData = {
          title: `${pkg.name} - 团购优惠`,
          description: description,
          image: pkg.imageUrl || `${baseUrl}/images/share-card.png`,
          url: `${baseUrl}/order?packageId=${packageId}`,
        };
      }
      
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error fetching package for share:', error);
      // 出错时使用默认分享内容
    }
  }
  
  res.render('public/order', { 
    baseUrl,
    shareTitle: shareData.title,
    shareDescription: shareData.description,
    shareImage: shareData.image,
    shareUrl: shareData.url,
  });
});

app.get('/group-buy', (req: Request, res: Response) => {
  res.redirect('/order');
});

// 成功页面
app.get('/success', (req: Request, res: Response) => {
  res.render('public/success', { orderId: req.query.orderId || '' });
});

// 订单查询页面
app.get('/query-order', (req: Request, res: Response) => {
  res.render('public/query-order');
});

// 根路径重定向
app.get('/', (req: Request, res: Response) => {
  res.redirect('/order');
});

// 404 处理
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: '页面不存在' });
});

// 错误处理
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  // 处理 multer 文件上传错误
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制，请上传小于 5MB 的图片文件' });
    }
    return res.status(400).json({ error: err.message || '文件上传失败' });
  }
  
  // 处理文件类型错误（multer fileFilter 抛出的错误）
  if (err.message && (err.message.includes('请上传') || err.message.includes('只允许上传'))) {
    return res.status(400).json({ error: err.message });
  }
  
  // 其他错误
  res.status(500).json({ error: '服务器内部错误' });
});

export default app;

