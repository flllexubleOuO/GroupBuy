import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { shopifyService } from '../services/shopifyService';

const prisma = new PrismaClient();

function storedUploadPath(file: Express.Multer.File | undefined): string | null {
  if (!file) return null;
  const anyFile = file as any;
  if (config.s3.enabled && anyFile.s3Key) {
    if (config.s3.publicAccess && anyFile.s3Url) return String(anyFile.s3Url);
    return `s3://${config.s3.bucket}/${String(anyFile.s3Key)}`;
  }
  return file.filename ? `/uploads/${file.filename}` : null;
}

export const showPaymentPage = async (req: Request, res: Response) => {
  const userId = req.session.auth?.userId;
  if (!userId) return res.redirect('/login');

  const orderId = String(req.query.orderId || '').trim();
  if (!orderId) return res.redirect('/cart');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, email: true } });
  const phone = user?.phone || '';

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return res.status(404).send('Order not found');
  if (order.phone !== phone) return res.status(403).send('Forbidden');

  let items: any[] = [];
  try {
    items = JSON.parse(order.itemsJson || '[]');
  } catch {
    items = [];
  }

  return res.render('public/payment', {
    userEmail: user?.email || '',
    order,
    items,
    error: null,
  });
};

export const submitPayment = async (req: Request, res: Response) => {
  const userId = req.session.auth?.userId;
  if (!userId) return res.redirect('/login');

  const orderId = String(req.params.orderId || '').trim();
  if (!orderId) return res.redirect('/cart');

  const paymentMethod = String(req.body.paymentMethod || 'transfer');
  const valid = ['transfer', 'cash_on_delivery'];
  const finalPaymentMethod = valid.includes(paymentMethod) ? paymentMethod : 'transfer';

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  const phone = user?.phone || '';

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return res.status(404).send('Order not found');
  if (order.phone !== phone) return res.status(403).send('Forbidden');

  // Transfer requires payment proof upload
  if (finalPaymentMethod === 'transfer' && !(req as any).file) {
    return res.status(400).send('Please upload payment proof.');
  }

  const screenshotPath = storedUploadPath((req as any).file);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentMethod: finalPaymentMethod,
      paymentScreenshotPath: finalPaymentMethod === 'transfer' ? screenshotPath : null,
    },
  });

  // Trigger Shopify sync after payment step (keeps "add to cart -> checkout -> pay" flow)
  try {
    const items = JSON.parse(order.itemsJson || '[]');
    const shopifyOrder = await shopifyService.createPaidOrder({
      items,
      customerName: order.customerName,
      phone: order.phone,
      address: order.address,
      deliveryTime: order.deliveryTime,
      localOrderId: order.id,
      paymentMethod: finalPaymentMethod,
      optionalNote: order.optionalNote || undefined,
    });
    await prisma.order.update({ where: { id: order.id }, data: { shopifyOrderId: shopifyOrder.id.toString() } });
  } catch (e) {
    console.error('Shopify order creation failed (payment step):', e);
    // Keep local order; admin can handle later
  }

  return res.redirect(`/success?orderId=${encodeURIComponent(order.id)}`);
};

