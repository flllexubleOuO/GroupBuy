import { Request, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

function randomToken(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

function processImagePath(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('s3://')) {
    try {
      const key = path.replace(`s3://${config.s3.bucket}/`, '');
      return `/api/images/s3/${key}`;
    } catch {
      return null;
    }
  }
  return path;
}

function buildStoredImagePath(file?: Express.Multer.File): string | null {
  if (!file) return null;
  if (config.s3.enabled && (file as any).s3Key) {
    const s3Key = (file as any).s3Key as string;
    if (config.s3.publicAccess && (file as any).s3Url) {
      return (file as any).s3Url as string;
    }
    return `s3://${config.s3.bucket}/${s3Key}`;
  }
  return file.filename ? `/uploads/${file.filename}` : null;
}

// ---------- User side ----------
export const showNewRequestForm = async (req: Request, res: Response) => {
  // Simple, hard-coded types for Phase 2; can be moved to DB later.
  const serviceTypes = [
    'Home Cleaning',
    'Deep Cleaning',
    'Moving Help',
    'Gardening / Lawn Care',
    'Handyman Visit',
    'Other',
  ];
  res.render('service-booking/requests-new', { serviceTypes });
};

export const createServiceRequest = async (req: any, res: Response) => {
  try {
    const { serviceType, title, description, address, preferredTime, userName, userPhone } = req.body;
    if (!serviceType || !description || !userName || !userPhone) {
      return res.status(400).render('service-booking/requests-new', {
        serviceTypes: ['Home Cleaning', 'Deep Cleaning', 'Moving Help', 'Gardening / Lawn Care', 'Handyman Visit', 'Other'],
        error: 'Missing required fields.',
      });
    }

    const isLoggedIn = Boolean(req.session?.auth?.userId);
    const userToken = isLoggedIn ? null : randomToken(16);
    const referenceImagePath = buildStoredImagePath(req.file);

    const created = await prisma.serviceRequest.create({
      data: {
        serviceType: String(serviceType).trim(),
        title: title ? String(title).trim() : null,
        description: String(description).trim(),
        address: address ? String(address).trim() : null,
        preferredTime: preferredTime ? String(preferredTime).trim() : null,
        referenceImagePath,
        status: 'open',
        userName: String(userName).trim(),
        userPhone: String(userPhone).trim(),
        userToken,
        userId: req.session?.auth?.userId || null,
      },
    });

    if (userToken) {
      return res.redirect(`/service-booking/requests/${created.id}?token=${userToken}`);
    }
    return res.redirect(`/service-booking/requests/${created.id}`);
  } catch (error) {
    console.error('Error creating service request:', error);
    return res.status(500).send('Failed to create request.');
  }
};

export const showUserRequestDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = String(req.query.token || '');

    const request = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        quotes: {
          include: { merchant: true },
          orderBy: { createdAt: 'desc' },
        },
        selectedQuote: {
          include: { merchant: true },
        },
      },
    });

    if (!request) return res.status(404).send('Request not found.');

    // Access control:
    // - logged-in user can access own request by userId (or by phone match for older data)
    // - otherwise fallback to legacy token link
    if (req.session?.auth?.userId) {
      const user = await prisma.user.findUnique({ where: { id: req.session.auth.userId } });
      const ok =
        Boolean(user && request.userId === user.id) ||
        Boolean(user && request.userPhone && request.userPhone === user.phone);
      if (!ok) return res.status(403).send('Forbidden');
    } else {
      if (!request.userToken) return res.status(401).send('Login required.');
      if (!token || request.userToken !== token) return res.status(403).send('Invalid token.');
    }

    const displayImage = processImagePath(request.referenceImagePath);
    res.render('service-booking/requests-detail', { request, token: request.userToken ? token : null, displayImage });
  } catch (error) {
    console.error('Error showing user request detail:', error);
    res.status(500).send('Failed to load request.');
  }
};

export const selectQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = String(req.query.token || '');
    const { quoteId } = req.body;
    if (!quoteId) return res.status(400).send('Missing quoteId.');

    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).send('Request not found.');

    if (req.session?.auth?.userId) {
      const user = await prisma.user.findUnique({ where: { id: req.session.auth.userId } });
      const ok =
        Boolean(user && request.userId === user.id) ||
        Boolean(user && request.userPhone && request.userPhone === user.phone);
      if (!ok) return res.status(403).send('Forbidden');
    } else {
      if (!request.userToken) return res.status(401).send('Login required.');
      if (!token || request.userToken !== token) return res.status(403).send('Invalid token.');
    }

    const quote = await prisma.merchantQuote.findUnique({ where: { id: quoteId } });
    if (!quote || quote.serviceRequestId !== id) return res.status(400).send('Invalid quote.');

    await prisma.serviceRequest.update({
      where: { id },
      data: { selectedQuoteId: quoteId, status: 'selected' },
    });

    if (request.userToken) return res.redirect(`/service-booking/requests/${id}?token=${token}`);
    return res.redirect(`/service-booking/requests/${id}`);
  } catch (error) {
    console.error('Error selecting quote:', error);
    res.status(500).send('Failed to select quote.');
  }
};

// ---------- Merchant side ----------
export const showMerchantDashboard = async (req: Request, res: Response) => {
  try {
    const key = String(req.query.key || '');
    let merchant = null as any;
    let effectiveKey: string | null = null;

    if (req.session?.auth?.userId && req.session?.auth?.role === 'MERCHANT') {
      merchant = await prisma.merchant.findFirst({ where: { userId: req.session.auth.userId } });
    }
    if (!merchant) {
      if (!key) {
        // New preferred flow: merchants should login via /login and be upgraded to MERCHANT role.
        // Keep legacy ?key=... links working, but don't show a raw 401 to normal users.
        if (req.session?.auth?.userId) return res.redirect('/account');
        return res.redirect('/login');
      }
      merchant = await prisma.merchant.findUnique({ where: { dashboardKey: key } });
      effectiveKey = key;
    }
    if (!merchant || !merchant.isActive) return res.status(403).send('Invalid merchant access.');

    const openRequests = await prisma.serviceRequest.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const myQuotes = await prisma.merchantQuote.findMany({
      where: { merchantId: merchant.id },
      select: { serviceRequestId: true },
    });
    const quotedSet = new Set(myQuotes.map((q) => q.serviceRequestId));

    res.render('service-booking/merchant-dashboard', { merchant, key: effectiveKey, openRequests, quotedSet });
  } catch (error) {
    console.error('Error showing merchant dashboard:', error);
    res.status(500).send('Failed to load dashboard.');
  }
};

export const showMerchantRequestDetail = async (req: Request, res: Response) => {
  try {
    const key = String(req.query.key || '');
    const { id } = req.params;
    let merchant = null as any;
    let effectiveKey: string | null = null;

    if (req.session?.auth?.userId && req.session?.auth?.role === 'MERCHANT') {
      merchant = await prisma.merchant.findFirst({ where: { userId: req.session.auth.userId } });
    }
    if (!merchant) {
      if (!key) {
        if (req.session?.auth?.userId) return res.redirect('/account');
        return res.redirect('/login');
      }
      merchant = await prisma.merchant.findUnique({ where: { dashboardKey: key } });
      effectiveKey = key;
    }
    if (!merchant || !merchant.isActive) return res.status(403).send('Invalid merchant access.');

    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).send('Request not found.');

    const myQuote = await prisma.merchantQuote.findUnique({
      where: { serviceRequestId_merchantId: { serviceRequestId: id, merchantId: merchant.id } },
    });

    const displayImage = processImagePath(request.referenceImagePath);
    res.render('service-booking/merchant-request-detail', { merchant, key: effectiveKey, request, myQuote, displayImage });
  } catch (error) {
    console.error('Error showing merchant request detail:', error);
    res.status(500).send('Failed to load request.');
  }
};

export const upsertMerchantQuote = async (req: Request, res: Response) => {
  try {
    const key = String(req.query.key || '');
    const { id } = req.params; // request id
    const { price, details, contactInfo } = req.body;
    if (!price) return res.status(400).send('Missing price.');

    // Normalize price input (allow "$150", "150 AUD", "150.00", etc.)
    const rawPrice = String(price).trim();
    const normalized = rawPrice.replace(/[^0-9.]/g, '');
    const priceNum = Number.parseFloat(normalized);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).send('Invalid price.');
    }
    const priceToStore = priceNum.toFixed(2);

    let merchant = null as any;
    let effectiveKey: string | null = null;
    if (req.session?.auth?.userId && req.session?.auth?.role === 'MERCHANT') {
      merchant = await prisma.merchant.findFirst({ where: { userId: req.session.auth.userId } });
    }
    if (!merchant) {
      if (!key) {
        if (req.session?.auth?.userId) return res.redirect('/account');
        return res.redirect('/login');
      }
      merchant = await prisma.merchant.findUnique({ where: { dashboardKey: key } });
      effectiveKey = key;
    }
    if (!merchant || !merchant.isActive) return res.status(403).send('Invalid merchant access.');

    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).send('Request not found.');

    await prisma.merchantQuote.upsert({
      where: { serviceRequestId_merchantId: { serviceRequestId: id, merchantId: merchant.id } },
      create: {
        serviceRequestId: id,
        merchantId: merchant.id,
        price: priceToStore,
        details: details ? String(details).trim() : null,
        contactInfo: contactInfo ? String(contactInfo).trim() : null,
      },
      update: {
        price: priceToStore,
        details: details ? String(details).trim() : null,
        contactInfo: contactInfo ? String(contactInfo).trim() : null,
      },
    });

    if (effectiveKey) {
      return res.redirect(`/service-booking/merchant/requests/${id}?key=${encodeURIComponent(effectiveKey)}`);
    }
    return res.redirect(`/service-booking/merchant/requests/${id}`);
  } catch (error) {
    console.error('Error upserting merchant quote:', error);
    res.status(500).send('Failed to submit quote.');
  }
};

