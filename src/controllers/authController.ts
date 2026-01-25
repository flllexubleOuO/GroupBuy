import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { hashPassword, verifyPassword } from '../utils/password';

const prisma = new PrismaClient();

type Role = 'USER' | 'MERCHANT' | 'ADMIN';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string) {
  return phone.trim();
}

function looksLikeEmail(s: string) {
  return s.includes('@');
}

export const showLogin = (req: Request, res: Response) => {
  res.render('public/login', { error: null, identifier: '' });
};

export const login = async (req: Request, res: Response) => {
  const identifier = String(req.body.identifier || '').trim();
  const password = String(req.body.password || '');

  if (!identifier || !password) {
    return res.status(400).render('public/login', { error: '请输入邮箱/手机号与密码', identifier });
  }

  const where = looksLikeEmail(identifier)
    ? { email: normalizeEmail(identifier) }
    : { phone: normalizePhone(identifier) };

  const user = await prisma.user.findUnique({ where: where as any });
  if (!user) {
    return res.status(401).render('public/login', { error: '账号或密码错误', identifier });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).render('public/login', { error: '账号或密码错误', identifier });
  }

  req.session.auth = { userId: user.id, role: user.role as Role };
  req.session.userId = user.id;
  req.session.userRole = user.role as Role;

  if (user.role === 'MERCHANT') return res.redirect('/merchant/dashboard');
  return res.redirect('/account');
};

export const showRegister = (req: Request, res: Response) => {
  res.render('public/register', { error: null, form: { email: '', phone: '' } });
};

export const register = async (req: Request, res: Response) => {
  const email = normalizeEmail(String(req.body.email || ''));
  const phone = normalizePhone(String(req.body.phone || ''));
  const password = String(req.body.password || '');
  const form = { email, phone };

  if (!email || !phone || !password) {
    return res.status(400).render('public/register', { error: '请填写邮箱、手机号和密码', form });
  }
  if (!email.includes('@')) {
    return res.status(400).render('public/register', { error: '邮箱格式不正确', form });
  }
  if (password.length < 6) {
    return res.status(400).render('public/register', { error: '密码至少 6 位', form });
  }

  const role: Role = 'USER';

  const passwordHash = await hashPassword(password);
  try {
    const created = await prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
        role,
      },
    });

    req.session.auth = { userId: created.id, role };
    req.session.userId = created.id;
    req.session.userRole = role;

    return res.redirect('/account');
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (msg.includes('Unique constraint') || msg.includes('UNIQUE')) {
      return res.status(409).render('public/register', { error: '邮箱或手机号已被注册', form });
    }
    console.error('register error:', e);
    return res.status(500).render('public/register', { error: '注册失败，请稍后再试', form });
  }
};

export const logout = (req: Request, res: Response) => {
  req.session?.destroy(() => {
    res.redirect('/login');
  });
};

// --------------------
// Admin login (/admin-login)
// --------------------

export const showAdminLogin = (req: Request, res: Response) => {
  res.render('admin/login', { error: null });
};

export const adminLogin = async (req: Request, res: Response) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  // Legacy config login (keeps existing deployments working)
  if (username === config.admin.username && password === config.admin.password) {
    req.session.isAuthenticated = true;
    req.session.userRole = 'ADMIN';
    return res.redirect('/admin/orders');
  }

  // Also allow DB-backed ADMIN accounts using "username" field as email/phone
  if (username && password) {
    const where = looksLikeEmail(username)
      ? { email: normalizeEmail(username) }
      : { phone: normalizePhone(username) };
    const user = await prisma.user.findUnique({ where: where as any });
    if (user && user.role === 'ADMIN') {
      const ok = await verifyPassword(password, user.passwordHash);
      if (ok) {
        req.session.auth = { userId: user.id, role: user.role as Role };
        req.session.userId = user.id;
        req.session.userRole = user.role as Role;
        req.session.isAuthenticated = true;
        return res.redirect('/admin/orders');
      }
    }
  }

  return res.status(401).render('admin/login', { error: '用户名或密码错误' });
};

