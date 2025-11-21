import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { shopifyService } from '../services/shopifyService';
import { config } from '../config';
import { getS3PresignedUrl, getS3PublicUrl } from '../services/s3Service';

const prisma = new PrismaClient();

/**
 * 处理订单中的图片路径：如果是 S3 key，转换为后端代理 URL
 */
async function processOrderImagePath(path: string | null): Promise<string | null> {
  if (!path) return null;
  
  // 检查是否是 S3 key（格式：s3://bucket/key）
  if (path.startsWith('s3://')) {
    try {
      // 提取 S3 key
      const s3Key = path.replace(`s3://${config.s3.bucket}/`, '');
      
      // 如果使用后端代理模式（推荐，更安全），返回代理 URL
      // 这样前端通过后端访问，而不是直接访问 S3
      return `/api/images/s3/${s3Key}`;
    } catch (error) {
      console.error('处理 S3 图片路径失败:', error);
      return null;
    }
  }
  
  // 本地路径，直接返回
  return path;
}

interface OrderItem {
  title: string;
  price: string;
  quantity: number;
  shopifyProductId?: string;
  shopifyVariantId?: string;
}

interface CreateOrderRequest extends Request {
  body: {
    customerName: string;
    phone: string;
    address: string;
    deliveryTime: string;
    optionalNote?: string;
    paymentMethod?: string; // 支付方式: "transfer" 或 "cash_on_delivery"
    items: string; // JSON string
    packageId?: string; // 套餐ID（可选）
  };
  file?: Express.Multer.File;
}

/**
 * 创建订单
 */
export const createOrder = async (req: CreateOrderRequest, res: Response) => {
  try {
    const { customerName, phone, address, deliveryTime, optionalNote, paymentMethod, items } = req.body;

    // 验证必填字段
    if (!customerName || !phone || !address || !deliveryTime || !items) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 验证支付方式
    const validPaymentMethods = ['transfer', 'cash_on_delivery'];
    const finalPaymentMethod = paymentMethod && validPaymentMethods.includes(paymentMethod) 
      ? paymentMethod 
      : 'transfer';

    // 如果选择立即转账，必须上传截图
    if (finalPaymentMethod === 'transfer' && !req.file) {
      return res.status(400).json({ error: '请上传付款截图' });
    }

    // 解析商品数据
    let itemsArray: OrderItem[];
    try {
      itemsArray = JSON.parse(items);
    } catch (e) {
      return res.status(400).json({ error: '商品数据格式错误' });
    }

    if (!Array.isArray(itemsArray) || itemsArray.length === 0) {
      return res.status(400).json({ error: '请至少选择一个商品' });
    }

    // 验证商品数据
    for (const item of itemsArray) {
      if (!item.title || !item.price || !item.quantity) {
        return res.status(400).json({ error: '商品信息不完整' });
      }
      if (item.quantity <= 0 || !Number.isInteger(Number(item.quantity))) {
        return res.status(400).json({ error: '商品数量必须是正整数' });
      }
    }

    // 保存付款截图路径
    // 如果启用了 S3，保存 S3 key（如果是公共访问则保存 URL）；否则使用本地路径
    let screenshotPath: string | null = null;
    if (req.file) {
      if (config.s3.enabled && req.file.s3Key) {
        // 使用 S3：如果是公共访问保存 URL，否则保存 key（稍后生成预签名 URL）
        if (config.s3.publicAccess && req.file.s3Url) {
          screenshotPath = req.file.s3Url;
        } else {
          // 私有存储：保存 S3 key，格式为 "s3://bucket/key" 以便识别
          screenshotPath = `s3://${config.s3.bucket}/${req.file.s3Key}`;
        }
      } else {
        // 使用本地路径（相对于 public 目录）
        screenshotPath = `/uploads/${req.file.filename}`;
      }
    }

    // 获取套餐的大区信息（如果订单关联了套餐）
    let orderRegion: string | null = null;
    const { packageId } = req.body;
    if (packageId) {
      const packageData = await prisma.package.findUnique({
        where: { id: packageId },
        select: { region: true },
      });
      if (packageData?.region) {
        orderRegion = packageData.region;
      }
    }

    // 创建本地订单记录
    const order = await prisma.order.create({
      data: {
        customerName,
        phone,
        address,
        deliveryTime,
        itemsJson: JSON.stringify(itemsArray),
        packageId: packageId || null,
        region: orderRegion,
        paymentMethod: finalPaymentMethod,
        paymentScreenshotPath: screenshotPath,
        optionalNote: optionalNote || null,
        internalStatus: 'new',
      },
    });

    // 创建 Shopify 订单
    try {
      const shopifyOrder = await shopifyService.createPaidOrder({
        items: itemsArray,
        customerName,
        phone,
        address,
        deliveryTime,
        localOrderId: order.id,
        paymentMethod: finalPaymentMethod,
        optionalNote: optionalNote,
      });

      // 更新订单，保存 Shopify 订单 ID
      await prisma.order.update({
        where: { id: order.id },
        data: { shopifyOrderId: shopifyOrder.id.toString() },
      });

      // 返回成功响应
      return res.json({
        success: true,
        orderId: order.id,
        shopifyOrderId: shopifyOrder.id,
      });
    } catch (shopifyError: any) {
      // Shopify 创建失败，但本地订单已创建
      console.error('Shopify order creation failed:', shopifyError);
      // 可以选择更新订单状态为错误，或者保持 new 状态让管理员手动处理
      return res.status(500).json({
        error: '订单已创建，但 Shopify 同步失败，请联系管理员',
        orderId: order.id,
      });
    }
  } catch (error: any) {
    console.error('Error creating order:', error);
    return res.status(500).json({ error: '创建订单失败: ' + error.message });
  }
};

/**
 * 获取订单列表（管理后台）
 */
export const getOrders = async (req: Request, res: Response) => {
  try {
    const { status, phone, region, deliveryDate, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status && status !== 'all') {
      where.internalStatus = status;
    }
    if (phone) {
      where.phone = { contains: phone as string };
    }
    if (region) {
      where.region = region;
    }
    if (deliveryDate) {
      // 配送时间包含指定日期（支持 YYYY-MM-DD 格式）
      where.deliveryTime = { contains: deliveryDate as string };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ]);

    // 解析 itemsJson 并处理图片路径
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => ({
        ...order,
        items: JSON.parse(order.itemsJson),
        paymentScreenshotPath: await processOrderImagePath(order.paymentScreenshotPath),
      }))
    );

    return res.json({
      orders: ordersWithItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ error: '获取订单列表失败: ' + error.message });
  }
};

/**
 * 获取单个订单详情
 */
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 处理图片路径
    const processedScreenshotPath = await processOrderImagePath(order.paymentScreenshotPath);

    return res.json({
      ...order,
      items: JSON.parse(order.itemsJson),
      paymentScreenshotPath: processedScreenshotPath,
    });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return res.status(500).json({ error: '获取订单详情失败: ' + error.message });
  }
};

/**
 * 更新订单状态
 */
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['new', 'paid_confirmed', 'preparing', 'delivering', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: '无效的订单状态' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { internalStatus: status },
    });

    // 处理图片路径
    const processedScreenshotPath = await processOrderImagePath(order.paymentScreenshotPath);

    return res.json({
      success: true,
      order: {
        ...order,
        items: JSON.parse(order.itemsJson),
        paymentScreenshotPath: processedScreenshotPath,
      },
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ error: '更新订单状态失败: ' + error.message });
  }
};

/**
 * 删除订单
 */
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查订单是否存在
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 如果订单有 Shopify 订单ID，先删除 Shopify 订单
    if (order.shopifyOrderId) {
      try {
        await shopifyService.deleteOrder(order.shopifyOrderId);
        console.log(`Shopify order ${order.shopifyOrderId} deleted successfully`);
      } catch (shopifyError: any) {
        // Shopify 删除失败，记录错误但继续删除本地订单
        console.error('Failed to delete Shopify order:', shopifyError);
        // 如果 Shopify 订单不存在（404），继续删除本地订单
        if (shopifyError.response?.status === 404 || shopifyError.message?.includes('404')) {
          console.warn(`Shopify order ${order.shopifyOrderId} not found, continuing with local deletion`);
        } else {
          // 其他错误，返回错误信息
          return res.status(500).json({ 
            error: '删除 Shopify 订单失败: ' + shopifyError.message + '。本地订单未删除。' 
          });
        }
      }
    }

    // 删除本地订单记录
    await prisma.order.delete({
      where: { id },
    });

    // 如果订单有付款截图，可以考虑删除文件（可选）
    // 这里暂时不删除文件，保留在服务器上

    return res.json({ 
      success: true, 
      message: order.shopifyOrderId 
        ? '订单已删除（包括 Shopify 订单）' 
        : '订单已删除' 
    });
  } catch (error: any) {
    console.error('Error deleting order:', error);
    return res.status(500).json({ error: '删除订单失败: ' + error.message });
  }
};

/**
 * 根据手机号查询订单（公开接口，用于用户查询自己的订单）
 */
export const getOrdersByPhone = async (req: Request, res: Response) => {
  try {
    const { phone } = req.query;

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: '请输入手机号' });
    }

    // 查询该手机号的所有订单，按创建时间倒序
    const orders = await prisma.order.findMany({
      where: {
        phone: phone.trim(),
      },
      orderBy: {
        createdAt: 'desc',
      },
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
        updatedAt: true,
        // 不返回 shopifyOrderId，保护隐私
      },
    });

    // 解析 itemsJson 并处理图片路径
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => ({
        ...order,
        items: JSON.parse(order.itemsJson),
        paymentScreenshotPath: await processOrderImagePath(order.paymentScreenshotPath),
      }))
    );

    return res.json({
      success: true,
      orders: ordersWithItems,
      count: ordersWithItems.length,
    });
  } catch (error: any) {
    console.error('Error fetching orders by phone:', error);
    return res.status(500).json({ error: '查询订单失败: ' + error.message });
  }
};

