import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

function toS3ProxyUrl(p: string | null): string | null {
  if (!p) return null;
  if (p.startsWith('s3://')) {
    try {
      const s3Key = p.replace(`s3://${config.s3.bucket}/`, '');
      return `/api/images/s3/${s3Key}`;
    } catch {
      return null;
    }
  }
  return p;
}

/**
 * My Orders page (login required)
 * Secure by design: only shows orders tied to the logged-in user's registered phone.
 */
export const showMyOrdersPage = async (req: Request, res: Response) => {
  const userId = req.session?.auth?.userId;
  if (!userId) return res.redirect('/login');

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, email: true } });
    const phone = user?.phone || '';

    const orders = await prisma.order.findMany({
      where: { phone },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        customerName: true,
        phone: true,
        address: true,
        deliveryTime: true,
        itemsJson: true,
        paymentMethod: true,
        paymentScreenshotPath: true,
        internalStatus: true,
        optionalNote: true,
        createdAt: true,
      },
      take: 50,
    });

    const ordersWithItems = orders.map((o) => {
      let items: any[] = [];
      try {
        items = JSON.parse(o.itemsJson || '[]');
      } catch {
        items = [];
      }
      return {
        ...o,
        items,
        paymentScreenshotPath: toS3ProxyUrl(o.paymentScreenshotPath),
      };
    });

    return res.render('public/query-order', {
      userEmail: user?.email || '',
      orders: ordersWithItems,
    });
  } catch (error: any) {
    console.error('Error rendering my orders page:', error);
    return res.status(500).send('Failed to load your orders.');
  }
};

