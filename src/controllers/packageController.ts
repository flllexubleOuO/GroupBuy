import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { mapProductNames } from '../utils/productNameMapper';

const prisma = new PrismaClient();

interface PackageItem {
  productId: string;
  variantId: string;
  title: string;
  price: string;
  quantity: number;
}

function toFriendlyDbErrorMessage(error: any): string | null {
  const msg = String(error?.message || '');
  // Prisma + SQLite schema mismatch (pending migrations / wrong DB file)
  if (msg.includes('does not exist in the current database') || msg.includes('no such column')) {
    if (msg.includes('Package.merchantId') || msg.includes('Service.merchantId')) {
      return '数据库结构未更新（缺少 merchantId 等字段）。请确认 .env 的 DATABASE_URL 指向正确的 db，并执行：npm run prisma:migrate，然后重启服务。';
    }
    return '数据库结构与当前代码不一致。请执行：npm run prisma:migrate，然后重启服务。';
  }
  return null;
}

/**
 * 获取所有套餐（前台用，只返回启用的）
 */
export const getActivePackages = async (req: Request, res: Response) => {
  try {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // 一次性获取所有 Shopify 商品（包含图片信息）
    const { shopifyService } = await import('../services/shopifyService');
    let shopifyProducts: any[] = [];
    try {
      shopifyProducts = await shopifyService.getProducts();
    } catch (error) {
      console.error('Error fetching Shopify products for images:', error);
    }

    // 创建商品ID到图片的映射
    const productImageMap = new Map<string, string>();
    shopifyProducts.forEach(product => {
      if (product.images && product.images.length > 0) {
        productImageMap.set(product.id.toString(), product.images[0].src);
      }
    });

    // 解析 itemsJson 并映射中文名称，同时添加商品图片
    const packagesWithItems = await Promise.all(
      packages.map(async (pkg) => {
        const items = JSON.parse(pkg.itemsJson);
        const mappedItems = await mapProductNames(items);
        
        // 为每个商品添加图片信息
        const itemsWithImages = mappedItems.map((item: any) => {
          if (item.shopifyProductId && productImageMap.has(item.shopifyProductId)) {
            return {
              ...item,
              imageUrl: productImageMap.get(item.shopifyProductId),
            };
          }
          return item;
        });
        
        // 如果没有设置套餐图片，使用第一个商品的图片
        let displayImageUrl = pkg.imageUrl;
        if (!displayImageUrl && itemsWithImages.length > 0 && itemsWithImages[0].imageUrl) {
          displayImageUrl = itemsWithImages[0].imageUrl;
        }
        
        return {
          ...pkg,
          items: itemsWithImages,
          deliveryDates: pkg.deliveryDatesJson ? JSON.parse(pkg.deliveryDatesJson) : null,
          imageUrl: displayImageUrl,
        };
      })
    );

    return res.json({ packages: packagesWithItems });
  } catch (error: any) {
    console.error('Error fetching packages:', error);
    const friendly = toFriendlyDbErrorMessage(error);
    return res.status(500).json({ error: '获取套餐列表失败: ' + (friendly || error.message) });
  }
};

/**
 * 获取所有套餐（后台管理用）
 */
export const getAllPackages = async (req: Request, res: Response) => {
  try {
    const packages = await prisma.package.findMany({
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
    });

    // 一次性获取所有 Shopify 商品（包含图片信息）
    const { shopifyService } = await import('../services/shopifyService');
    let shopifyProducts: any[] = [];
    try {
      shopifyProducts = await shopifyService.getProducts();
    } catch (error) {
      console.error('Error fetching Shopify products for images:', error);
    }

    // 创建商品ID到图片的映射
    const productImageMap = new Map<string, string>();
    shopifyProducts.forEach(product => {
      if (product.images && product.images.length > 0) {
        productImageMap.set(product.id.toString(), product.images[0].src);
      }
    });

    // 解析 itemsJson 并映射中文名称，同时添加商品图片
    const packagesWithItems = await Promise.all(
      packages.map(async (pkg) => {
        const items = JSON.parse(pkg.itemsJson);
        const mappedItems = await mapProductNames(items);
        
        // 为每个商品添加图片信息
        const itemsWithImages = mappedItems.map((item: any) => {
          if (item.shopifyProductId && productImageMap.has(item.shopifyProductId)) {
            return {
              ...item,
              imageUrl: productImageMap.get(item.shopifyProductId),
            };
          }
          return item;
        });
        
        // 如果没有设置套餐图片，使用第一个商品的图片
        let displayImageUrl = pkg.imageUrl;
        if (!displayImageUrl && itemsWithImages.length > 0 && itemsWithImages[0].imageUrl) {
          displayImageUrl = itemsWithImages[0].imageUrl;
        }
        
        return {
          ...pkg,
          items: itemsWithImages,
          deliveryDates: pkg.deliveryDatesJson ? JSON.parse(pkg.deliveryDatesJson) : null,
          imageUrl: displayImageUrl,
        };
      })
    );

    return res.json({ packages: packagesWithItems });
  } catch (error: any) {
    console.error('Error fetching packages:', error);
    const friendly = toFriendlyDbErrorMessage(error);
    return res.status(500).json({ error: '获取套餐列表失败: ' + (friendly || error.message) });
  }
};

/**
 * 获取单个套餐详情
 */
export const getPackageById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pkg = await prisma.package.findUnique({
      where: { id },
    });

    if (!pkg) {
      return res.status(404).json({ error: '套餐不存在' });
    }

    // 获取 Shopify 商品图片
    const { shopifyService } = await import('../services/shopifyService');
    let shopifyProducts: any[] = [];
    try {
      shopifyProducts = await shopifyService.getProducts();
    } catch (error) {
      console.error('Error fetching Shopify products for images:', error);
    }

    // 创建商品ID到图片的映射
    const productImageMap = new Map<string, string>();
    shopifyProducts.forEach(product => {
      if (product.images && product.images.length > 0) {
        productImageMap.set(product.id.toString(), product.images[0].src);
      }
    });

    // 解析 itemsJson 并映射中文名称，同时添加商品图片
    const items = JSON.parse(pkg.itemsJson);
    const mappedItems = await mapProductNames(items);
    
    // 为每个商品添加图片信息
    const itemsWithImages = mappedItems.map((item: any) => {
      if (item.shopifyProductId && productImageMap.has(item.shopifyProductId)) {
        return {
          ...item,
          imageUrl: productImageMap.get(item.shopifyProductId),
        };
      }
      return item;
    });
    
    // 如果没有设置套餐图片，使用第一个商品的图片
    let displayImageUrl = pkg.imageUrl;
    if (!displayImageUrl && itemsWithImages.length > 0 && itemsWithImages[0].imageUrl) {
      displayImageUrl = itemsWithImages[0].imageUrl;
    }

    return res.json({
      ...pkg,
      items: itemsWithImages,
      deliveryDates: pkg.deliveryDatesJson ? JSON.parse(pkg.deliveryDatesJson) : null,
      imageUrl: displayImageUrl,
    });
  } catch (error: any) {
    console.error('Error fetching package:', error);
    return res.status(500).json({ error: '获取套餐详情失败: ' + error.message });
  }
};

/**
 * 创建套餐
 */
export const createPackage = async (req: Request, res: Response) => {
  try {
    const { name, description, originalPrice, price, items, deliveryDates, region, imageUrl, isActive, sortOrder } = req.body;

    // 验证必填字段
    if (!name || !price || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '缺少必填字段：名称、价格、商品列表' });
    }

    // 验证商品数据（现在需要包含 shopifyProductId 和 shopifyVariantId）
    for (const item of items) {
      if (!item.shopifyProductId || !item.shopifyVariantId || !item.quantity) {
        return res.status(400).json({ error: '商品信息不完整，必须包含 Shopify 商品ID和变体ID' });
      }
    }

    // 验证大区
    const validRegions = ['中区', '西区', '北岸', '东区'];
    if (!region || !validRegions.includes(region)) {
      return res.status(400).json({ error: '请选择有效的大区' });
    }

    const pkg = await prisma.package.create({
      data: {
        name,
        description: description || null,
        originalPrice: originalPrice ? String(originalPrice) : null,
        price: String(price),
        itemsJson: JSON.stringify(items),
        deliveryDatesJson: deliveryDates && Array.isArray(deliveryDates) && deliveryDates.length > 0 
          ? JSON.stringify(deliveryDates) 
          : null,
        region: region,
        imageUrl: imageUrl || null,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder || 0,
      },
    });

    return res.json({
      success: true,
      package: {
        ...pkg,
        items: JSON.parse(pkg.itemsJson),
      },
    });
  } catch (error: any) {
    console.error('Error creating package:', error);
    return res.status(500).json({ error: '创建套餐失败: ' + error.message });
  }
};

/**
 * 更新套餐
 */
export const updatePackage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, originalPrice, price, items, deliveryDates, region, imageUrl, isActive, sortOrder } = req.body;

    // 验证商品数据
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (!item.shopifyProductId || !item.shopifyVariantId || !item.quantity) {
          return res.status(400).json({ error: '商品信息不完整，必须包含 Shopify 商品ID和变体ID' });
        }
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (originalPrice !== undefined) updateData.originalPrice = originalPrice ? String(originalPrice) : null;
    if (price !== undefined) updateData.price = String(price);
    if (items !== undefined) updateData.itemsJson = JSON.stringify(items);
    if (deliveryDates !== undefined) {
      updateData.deliveryDatesJson = deliveryDates && Array.isArray(deliveryDates) && deliveryDates.length > 0
        ? JSON.stringify(deliveryDates)
        : null;
    }
    if (region !== undefined) {
      const validRegions = ['中区', '西区', '北岸', '东区'];
      if (region && !validRegions.includes(region)) {
        return res.status(400).json({ error: '请选择有效的大区' });
      }
      updateData.region = region;
    }
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const pkg = await prisma.package.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      success: true,
      package: {
        ...pkg,
        items: JSON.parse(pkg.itemsJson),
      },
    });
  } catch (error: any) {
    console.error('Error updating package:', error);
    return res.status(500).json({ error: '更新套餐失败: ' + error.message });
  }
};

/**
 * 删除套餐
 */
export const deletePackage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.package.delete({
      where: { id },
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting package:', error);
    return res.status(500).json({ error: '删除套餐失败: ' + error.message });
  }
};

