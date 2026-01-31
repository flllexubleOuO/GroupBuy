import { PrismaClient } from '@prisma/client';
import type { Request, Response } from 'express';

const prisma = new PrismaClient();

function toInt(value: unknown, fallback: number): number {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export const showMerchantSearch = async (req: Request, res: Response) => {
  const qRaw = String(req.query.q || '').trim();
  const q = qRaw.length ? qRaw.slice(0, 80) : '';
  const page = Math.max(1, toInt(req.query.page, 1));
  const limit = Math.min(50, Math.max(1, toInt(req.query.limit, 12)));
  const skip = (page - 1) * limit;

  const baseWhere = { isActive: true } as const;

  const where = q
    ? {
        ...baseWhere,
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { address: { contains: q } },
        ],
      }
    : baseWhere;

  const [merchants, total] = await Promise.all([
    prisma.merchant.findMany({
      where,
      include: {
        _count: { select: { packages: true, services: true } },
      },
      skip,
      take: limit,
      orderBy: q
        ? [{ updatedAt: 'desc' }]
        : [
            { packages: { _count: 'desc' } },
            { services: { _count: 'desc' } },
            { updatedAt: 'desc' },
          ],
    }),
    prisma.merchant.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  qs.set('limit', String(limit));

  res.render('public/merchants', {
    q,
    merchants,
    pagination: { page, limit, total, totalPages },
    queryString: qs.toString(),
  });
};

export const showMerchantDetail = async (req: Request, res: Response) => {
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(404).send('Not found');

  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: {
      _count: { select: { packages: true, services: true } },
    },
  });
  if (!merchant || !merchant.isActive) return res.status(404).send('Merchant not found');

  const [packages, services] = await Promise.all([
    prisma.package.findMany({
      where: { merchantId: merchant.id, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      take: 100,
    }),
    prisma.service.findMany({
      where: { merchantId: merchant.id, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      take: 100,
    }),
  ]);

  res.render('public/merchant-detail', { merchant, packages, services });
};

