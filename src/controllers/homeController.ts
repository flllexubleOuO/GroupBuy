import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const showHome = async (req: Request, res: Response) => {
  try {
    const hotPackages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        originalPrice: true,
        region: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    res.render('public/home', {
      hotPackages,
    });
  } catch (error) {
    console.error('Error rendering home page:', error);
    res.status(500).render('public/home', {
      hotPackages: [],
    });
  }
};

