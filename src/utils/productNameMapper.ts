import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 获取商品的中文名称
 * @param shopifyProductId Shopify 商品ID
 * @param shopifyVariantId Shopify 变体ID（可选）
 * @param englishName 英文名称（如果没有映射则返回这个）
 * @returns 中文名称，如果没有映射则返回英文名称
 */
export async function getChineseName(
  shopifyProductId: string,
  englishName: string,
  shopifyVariantId?: string
): Promise<string> {
  try {
    const mapping = await prisma.productNameMapping.findUnique({
      where: { shopifyProductId },
    });

    if (mapping) {
      return mapping.chineseName;
    }

    return englishName;
  } catch (error) {
    console.error('Error getting Chinese name:', error);
    return englishName;
  }
}

/**
 * 批量获取商品的中文名称
 * @param items 商品列表，包含 shopifyProductId 和 title
 * @returns 更新后的商品列表，title 替换为中文名称
 */
export async function mapProductNames(items: Array<{
  shopifyProductId?: string;
  shopifyVariantId?: string;
  title: string;
  [key: string]: any;
}>): Promise<Array<any>> {
  try {
    const productIds = items
      .map(item => item.shopifyProductId)
      .filter(Boolean) as string[];

    if (productIds.length === 0) {
      return items;
    }

    const mappings = await prisma.productNameMapping.findMany({
      where: {
        shopifyProductId: { in: productIds },
      },
    });

    // 创建映射：shopifyProductId -> chineseName
    const mappingMap = new Map(
      mappings.map(m => [m.shopifyProductId, m.chineseName])
    );

    return items.map(item => {
      if (item.shopifyProductId && mappingMap.has(item.shopifyProductId)) {
        const chineseName = mappingMap.get(item.shopifyProductId)!;
        return {
          ...item,
          title: chineseName, // 使用中文名称
          originalTitle: item.originalTitle || item.title, // 保留原始英文名称（如果已有则保留，否则使用当前 title）
        };
      }
      // 如果没有映射，确保 originalTitle 存在
      return {
        ...item,
        originalTitle: item.originalTitle || item.title, // 如果没有 originalTitle，使用当前 title
      };
    });
  } catch (error) {
    console.error('Error mapping product names:', error);
    return items;
  }
}

