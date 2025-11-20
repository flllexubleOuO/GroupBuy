import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 获取所有商品名称映射
 */
export const getAllMappings = async (req: Request, res: Response) => {
  try {
    const mappings = await prisma.productNameMapping.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ mappings });
  } catch (error: any) {
    console.error('Error fetching mappings:', error);
    return res.status(500).json({ error: '获取映射列表失败: ' + error.message });
  }
};

/**
 * 获取单个映射
 */
export const getMappingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const mapping = await prisma.productNameMapping.findUnique({
      where: { id },
    });

    if (!mapping) {
      return res.status(404).json({ error: '映射不存在' });
    }

    return res.json({ mapping });
  } catch (error: any) {
    console.error('Error fetching mapping:', error);
    return res.status(500).json({ error: '获取映射详情失败: ' + error.message });
  }
};

/**
 * 创建或更新映射
 */
export const upsertMapping = async (req: Request, res: Response) => {
  try {
    const { shopifyProductId, shopifyVariantId, englishName, chineseName } = req.body;

    if (!shopifyProductId || !englishName || !chineseName) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 使用 upsert：如果存在则更新，不存在则创建
    const mapping = await prisma.productNameMapping.upsert({
      where: {
        shopifyProductId: shopifyProductId,
      },
      update: {
        shopifyVariantId: shopifyVariantId || null,
        englishName,
        chineseName,
      },
      create: {
        shopifyProductId,
        shopifyVariantId: shopifyVariantId || null,
        englishName,
        chineseName,
      },
    });

    return res.json({ success: true, mapping });
  } catch (error: any) {
    console.error('Error upserting mapping:', error);
    return res.status(500).json({ error: '保存映射失败: ' + error.message });
  }
};

/**
 * 删除映射
 */
export const deleteMapping = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.productNameMapping.delete({
      where: { id },
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting mapping:', error);
    return res.status(500).json({ error: '删除映射失败: ' + error.message });
  }
};

/**
 * 批量创建映射
 */
export const batchCreateMappings = async (req: Request, res: Response) => {
  try {
    const { mappings } = req.body;

    if (!Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({ error: '映射列表不能为空' });
    }

    const results = [];
    for (const mapping of mappings) {
      const { shopifyProductId, shopifyVariantId, englishName, chineseName } = mapping;
      
      if (!shopifyProductId || !englishName || !chineseName) {
        continue;
      }

      try {
        const result = await prisma.productNameMapping.upsert({
          where: { shopifyProductId },
          update: {
            shopifyVariantId: shopifyVariantId || null,
            englishName,
            chineseName,
          },
          create: {
            shopifyProductId,
            shopifyVariantId: shopifyVariantId || null,
            englishName,
            chineseName,
          },
        });
        results.push(result);
      } catch (err) {
        console.error('Error creating mapping:', err);
      }
    }

    return res.json({ success: true, count: results.length, mappings: results });
  } catch (error: any) {
    console.error('Error batch creating mappings:', error);
    return res.status(500).json({ error: '批量创建映射失败: ' + error.message });
  }
};

