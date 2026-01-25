import { Request, Response, NextFunction } from 'express';

/**
 * Admin guard (used by /admin/*)
 * Supports:
 * - legacy session flag req.session.isAuthenticated
 * - role-based session req.session.auth.role === 'ADMIN'
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const role = req.session?.auth?.role || req.session?.userRole;
  if (req.session?.isAuthenticated || role === 'ADMIN') {
    return next();
  }
  return res.redirect('/admin-login');
};

/**
 * If admin is already logged in, redirect to admin orders.
 */
export const redirectIfAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const role = req.session?.auth?.role || req.session?.userRole;
  if (req.session?.isAuthenticated || role === 'ADMIN') {
    return res.redirect('/admin/orders');
  }
  next();
};

/**
 * User/merchant guard.
 */
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
