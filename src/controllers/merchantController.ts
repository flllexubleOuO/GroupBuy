import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function buildStoredImageUrl(file: Express.Multer.File | undefined): string | null {
  if (!file) return null;
  const anyFile = file as any;
  if (anyFile.s3Url) return String(anyFile.s3Url);
  if (file.filename) return `/uploads/${file.filename}`;
  return null;
}

async function getMyMerchant(req: Request) {
  const userId = req.session.auth?.userId;
  if (!userId) return null;
  return prisma.merchant.findFirst({ where: { userId } });
}

function ensureSessionRole(req: Request, role: 'USER' | 'MERCHANT' | 'ADMIN') {
  if (!req.session.auth) return;
  req.session.auth.role = role;
  req.session.userRole = role;
}

export const onboardToMerchant = async (req: Request, res: Response) => {
  const userId = req.session.auth?.userId;
  if (!userId) return res.redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.redirect('/login');
  if (user.role === 'ADMIN') return res.status(403).send('Forbidden');

  // If already merchant, just go dashboard.
  if (user.role === 'MERCHANT') {
    ensureSessionRole(req, 'MERCHANT');
    return res.redirect('/merchant/dashboard');
  }

  const storeName = String(req.body.storeName || '').trim();
  if (!storeName) {
    return res.status(400).render('merchant/upgrade', {
      error: 'Store name is required.',
      form: {
        storeName,
        contactName: String((req.body as any).contactName || '').trim(),
        wechat: String((req.body as any).wechat || '').trim(),
        openHours: String((req.body as any).openHours || '').trim(),
        address: String((req.body as any).address || '').trim(),
        description: String((req.body as any).description || '').trim(),
      },
    });
  }

  const existing = await prisma.merchant.findFirst({ where: { userId: user.id } });
  if (!existing) {
    await prisma.merchant.create({
      data: {
        name: storeName,
        dashboardKey: user.id.replace(/-/g, '').slice(0, 32) || crypto.randomBytes(16).toString('hex'),
        isActive: true,
        userId: user.id,
        email: user.email,
        phone: user.phone,
        contactName: String(req.body.contactName || '').trim() || null,
        wechat: String(req.body.wechat || '').trim() || null,
        description: String(req.body.description || '').trim() || null,
        address: String(req.body.address || '').trim() || null,
        openHours: String(req.body.openHours || '').trim() || null,
      },
    });
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: 'MERCHANT' } });
  ensureSessionRole(req, 'MERCHANT');

  return res.redirect('/merchant/dashboard');
};

export const showMerchantUpgrade = async (req: Request, res: Response) => {
  const userId = req.session.auth?.userId;
  if (!userId) return res.redirect('/login');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.redirect('/login');
  if (user.role === 'ADMIN') return res.status(403).send('Forbidden');
  if (user.role === 'MERCHANT') return res.redirect('/merchant/dashboard');

  return res.render('merchant/upgrade', { error: null, form: {} });
};

export const showMerchantDashboard = async (req: Request, res: Response) => {
  const merchant = await getMyMerchant(req);
  if (!merchant) return res.status(403).send('Merchant profile not found');

  const [packages, services] = await Promise.all([
    prisma.package.findMany({ where: { merchantId: merchant.id }, orderBy: { updatedAt: 'desc' }, take: 100 }),
    prisma.service.findMany({ where: { merchantId: merchant.id }, orderBy: { updatedAt: 'desc' }, take: 100 }),
  ]);

  res.render('merchant/dashboard', { merchant, packages, services, error: null });
};

export const updateMerchantProfile = async (req: Request, res: Response) => {
  const merchant = await getMyMerchant(req);
  if (!merchant) return res.status(403).send('Merchant profile not found');

  const uploadedImageUrl = buildStoredImageUrl((req as any).file);
  const imageUrlFromInput = String((req.body as any).imageUrl || '').trim() || null;
  const finalImageUrl = uploadedImageUrl || imageUrlFromInput || merchant.imageUrl || null;

  const data = {
    name: String(req.body.name || '').trim() || merchant.name,
    contactName: String(req.body.contactName || '').trim() || null,
    phone: String(req.body.phone || '').trim() || null,
    wechat: String(req.body.wechat || '').trim() || null,
    email: String(req.body.email || '').trim() || null,
    description: String(req.body.description || '').trim() || null,
    address: String(req.body.address || '').trim() || null,
    openHours: String(req.body.openHours || '').trim() || null,
    imageUrl: finalImageUrl,
  };

  await prisma.merchant.update({ where: { id: merchant.id }, data });
  return res.redirect('/merchant/dashboard');
};

export const createMerchantPackage = async (req: Request, res: Response) => {
  const merchant = await getMyMerchant(req);
  if (!merchant) return res.status(403).send('Merchant profile not found');

  const name = String(req.body.name || '').trim();
  const price = String(req.body.price || '').trim();
  if (!name || !price) return res.status(400).send('Missing name/price');

  await prisma.package.create({
    data: {
      name,
      price,
      description: String(req.body.description || '').trim() || null,
      originalPrice: String(req.body.originalPrice || '').trim() || null,
      region: String(req.body.region || '').trim() || null,
      imageUrl: String(req.body.imageUrl || '').trim() || null,
      isActive: String(req.body.isActive || '') === 'on',
      sortOrder: Number(req.body.sortOrder || 0) || 0,
      itemsJson: String(req.body.itemsJson || '[]'),
      deliveryDatesJson: String(req.body.deliveryDatesJson || '').trim() || null,
      merchantId: merchant.id,
    },
  });
  return res.redirect('/merchant/dashboard');
};

export const deleteMerchantPackage = async (req: Request, res: Response) => {
  const merchant = await getMyMerchant(req);
  if (!merchant) return res.status(403).send('Merchant profile not found');
  const id = String(req.params.id || '');
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg || pkg.merchantId !== merchant.id) return res.status(404).send('Not found');
  await prisma.package.delete({ where: { id } });
  return res.redirect('/merchant/dashboard');
};

export const createMerchantService = async (req: Request, res: Response) => {
  const merchant = await getMyMerchant(req);
  if (!merchant) return res.status(403).send('Merchant profile not found');

  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).send('Missing name');

  await prisma.service.create({
    data: {
      name,
      description: String(req.body.description || '').trim() || null,
      price: String(req.body.price || '').trim() || null,
      durationMins: req.body.durationMins ? Number(req.body.durationMins) : null,
      timeSlotsJson: String(req.body.timeSlotsJson || '').trim() || null,
      imageUrl: String(req.body.imageUrl || '').trim() || null,
      isActive: String(req.body.isActive || '') === 'on',
      sortOrder: Number(req.body.sortOrder || 0) || 0,
      merchantId: merchant.id,
    },
  });
  return res.redirect('/merchant/dashboard');
};

export const deleteMerchantService = async (req: Request, res: Response) => {
  const merchant = await getMyMerchant(req);
  if (!merchant) return res.status(403).send('Merchant profile not found');
  const id = String(req.params.id || '');
  const svc = await prisma.service.findUnique({ where: { id } });
  if (!svc || svc.merchantId !== merchant.id) return res.status(404).send('Not found');
  await prisma.service.delete({ where: { id } });
  return res.redirect('/merchant/dashboard');
};

export const showMerchantPackageDetail = async (req: Request, res: Response) => {
  const merchant = await getMyMerchant(req);
  if (!merchant) return res.status(403).send('Merchant profile not found');

  const id = String(req.params.id || '');
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg || pkg.merchantId !== merchant.id) return res.status(404).send('Not found');

  let items: any[] = [];
  try {
    items = JSON.parse(pkg.itemsJson || '[]');
  } catch {
    items = [];
  }

  let deliveryDates: string[] | null = null;
  try {
    deliveryDates = pkg.deliveryDatesJson ? JSON.parse(pkg.deliveryDatesJson) : null;
  } catch {
    deliveryDates = null;
  }

  return res.render('merchant/package-detail', { merchant, pkg, items, deliveryDates });
};

export const showMerchantServiceDetail = async (req: Request, res: Response) => {
  const merchant = await getMyMerchant(req);
  if (!merchant) return res.status(403).send('Merchant profile not found');

  const id = String(req.params.id || '');
  const svc = await prisma.service.findUnique({ where: { id } });
  if (!svc || svc.merchantId !== merchant.id) return res.status(404).send('Not found');

  let timeSlots: string[] = [];
  try {
    timeSlots = svc.timeSlotsJson ? JSON.parse(svc.timeSlotsJson) : [];
  } catch {
    timeSlots = [];
  }

  return res.render('merchant/service-detail', { merchant, svc, timeSlots });
};
