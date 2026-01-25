import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const showAccount = async (req: Request, res: Response) => {
  const userId = req.session.auth?.userId;
  if (!userId) return res.redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.redirect('/login');

  const [groupBuyOrders, serviceBookings, serviceRequests] = await Promise.all([
    prisma.order.findMany({
      where: { OR: [{ userId: user.id }, { phone: user.phone }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.serviceBooking.findMany({
      where: { OR: [{ userId: user.id }, { phone: user.phone }] },
      include: { service: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.serviceRequest.findMany({
      where: { OR: [{ userId: user.id }, { userPhone: user.phone }] },
      include: {
        quotes: { include: { merchant: true }, orderBy: { createdAt: 'desc' } },
        selectedQuote: { include: { merchant: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  res.render('public/account', { user, groupBuyOrders, serviceBookings, serviceRequests });
};

