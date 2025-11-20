import { Request, Response, NextFunction } from 'express';

// 扩展 Express Request 类型以包含 session
declare global {
  namespace Express {
    interface Request {
      session?: {
        isAuthenticated?: boolean;
      };
    }
  }
}

/**
 * 检查用户是否已登录
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.isAuthenticated) {
    return next();
  }
  res.redirect('/admin/login');
};

/**
 * 如果已登录，重定向到订单列表
 */
export const redirectIfAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.isAuthenticated) {
    return res.redirect('/admin/orders');
  }
  next();
};

