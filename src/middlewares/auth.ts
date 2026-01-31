import { Request, Response, NextFunction } from 'express';

/**
 * 检查管理员是否已登录（
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const role = req.session?.auth?.role || req.session?.userRole;
  if (req.session?.isAuthenticated || role === 'ADMIN') {
    return next();
  }
  res.redirect('/admin-login');
};

/**
 * 旧版：如果管理员已登录，重定向到订单列表
 */
export const redirectIfAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const role = req.session?.auth?.role || req.session?.userRole;
  if (req.session?.isAuthenticated || role === 'ADMIN') {
    return res.redirect('/admin/orders');
  }
  next();
};

export const requireUserAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.session?.auth?.userId) return next();
  return res.redirect('/login');
};

export const requireRole = (allowed: Array<'USER' | 'MERCHANT' | 'ADMIN'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.session?.auth?.role;
    if (role && allowed.includes(role)) return next();
    // fallback: legacy admin session
    if (allowed.includes('ADMIN') && req.session?.isAuthenticated) return next();
    return res.status(403).send('Forbidden');
  };
};

export const requireMerchant = requireRole(['MERCHANT']);
export const requireAdmin = requireRole(['ADMIN']);
