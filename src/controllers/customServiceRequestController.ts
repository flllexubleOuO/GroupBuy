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

    const userToken = randomToken(16);
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
      },
    });

    return res.redirect(`/service-booking/requests/${created.id}?token=${userToken}`);
  } catch (error) {
    console.error('Error creating service request:', error);
    return res.status(500).send('Failed to create request.');
  }
};

export const showUserRequestDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = String(req.query.token || '');
    if (!token) return res.status(401).send('Missing token.');

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
    if (request.userToken !== token) return res.status(403).send('Invalid token.');

    const displayImage = processImagePath(request.referenceImagePath);
    res.render('service-booking/requests-detail', { request, token, displayImage });
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
    if (!token) return res.status(401).send('Missing token.');
    if (!quoteId) return res.status(400).send('Missing quoteId.');

    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).send('Request not found.');
    if (request.userToken !== token) return res.status(403).send('Invalid token.');

    const quote = await prisma.merchantQuote.findUnique({ where: { id: quoteId } });
    if (!quote || quote.serviceRequestId !== id) return res.status(400).send('Invalid quote.');

    await prisma.serviceRequest.update({
      where: { id },
      data: { selectedQuoteId: quoteId, status: 'selected' },
    });

    res.redirect(`/service-booking/requests/${id}?token=${token}`);
  } catch (error) {
    console.error('Error selecting quote:', error);
    res.status(500).send('Failed to select quote.');
  }
};

// ---------- Merchant side ----------
export const showMerchantDashboard = async (req: Request, res: Response) => {
  try {
    const key = String(req.query.key || '');
    if (!key) return res.status(401).send('Missing key.');

    const merchant = await prisma.merchant.findUnique({ where: { dashboardKey: key } });
    if (!merchant || !merchant.isActive) return res.status(403).send('Invalid merchant key.');

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

    res.render('service-booking/merchant-dashboard', { merchant, key, openRequests, quotedSet });
  } catch (error) {
    console.error('Error showing merchant dashboard:', error);
    res.status(500).send('Failed to load dashboard.');
  }
};

export const showMerchantRequestDetail = async (req: Request, res: Response) => {
  try {
    const key = String(req.query.key || '');
    const { id } = req.params;
    if (!key) return res.status(401).send('Missing key.');

    const merchant = await prisma.merchant.findUnique({ where: { dashboardKey: key } });
    if (!merchant || !merchant.isActive) return res.status(403).send('Invalid merchant key.');

    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).send('Request not found.');

    const myQuote = await prisma.merchantQuote.findUnique({
      where: { serviceRequestId_merchantId: { serviceRequestId: id, merchantId: merchant.id } },
    });

    const displayImage = processImagePath(request.referenceImagePath);
    res.render('service-booking/merchant-request-detail', { merchant, key, request, myQuote, displayImage });
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
    if (!key) return res.status(401).send('Missing key.');
    if (!price) return res.status(400).send('Missing price.');

    const merchant = await prisma.merchant.findUnique({ where: { dashboardKey: key } });
    if (!merchant || !merchant.isActive) return res.status(403).send('Invalid merchant key.');

    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).send('Request not found.');

    await prisma.merchantQuote.upsert({
      where: { serviceRequestId_merchantId: { serviceRequestId: id, merchantId: merchant.id } },
      create: {
        serviceRequestId: id,
        merchantId: merchant.id,
        price: String(price).trim(),
        details: details ? String(details).trim() : null,
        contactInfo: contactInfo ? String(contactInfo).trim() : null,
      },
      update: {
        price: String(price).trim(),
        details: details ? String(details).trim() : null,
        contactInfo: contactInfo ? String(contactInfo).trim() : null,
      },
    });

    res.redirect(`/service-booking/merchant/requests/${id}?key=${encodeURIComponent(key)}`);
  } catch (error) {
    console.error('Error upserting merchant quote:', error);
    res.status(500).send('Failed to submit quote.');
  }
};

