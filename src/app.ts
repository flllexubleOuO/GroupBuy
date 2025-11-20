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
app.get('/order', (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.render('public/order', { baseUrl });
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

