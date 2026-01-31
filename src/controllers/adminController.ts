import { Request, Response } from 'express';
import { config } from '../config';
import { shopifyService } from '../services/shopifyService';

/**
 * 显示登录页面
 */
export const showLogin = (req: Request, res: Response) => {
  res.render('admin/login', { error: null });
};

/**
 * 处理登录
 */
export const login = (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (username === config.admin.username && password === config.admin.password) {
    req.session!.isAuthenticated = true;
    return res.redirect('/admin/orders');
  }

  res.render('admin/login', { error: 'Invalid username or password.' });
};

/**
 * 登出
 */
export const logout = (req: Request, res: Response) => {
  req.session?.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/admin-login');
  });
};

/**
 * 显示订单列表页面
 */
export const showOrders = async (req: Request, res: Response) => {
  try {
    const { status, phone } = req.query;

    // 构建查询参数
    const params = new URLSearchParams();
    if (status) params.append('status', status as string);
    if (phone) params.append('phone', phone as string);

    const queryString = params.toString();
    const url = `/admin/orders${queryString ? '?' + queryString : ''}`;

    res.render('admin/orders', {
      status: status || 'all',
      phone: phone || '',
      queryString: queryString,
    });
  } catch (error: any) {
    console.error('Error rendering orders page:', error);
    res.status(500).render('admin/orders', {
      error: 'Failed to load orders.',
      status: 'all',
      phone: '',
      queryString: '',
    });
  }
};

/**
 * 显示订单详情页面
 */
export const showOrderDetail = (req: Request, res: Response) => {
  const { id } = req.params;
  res.render('admin/order-detail', { orderId: id });
};

/**
 * 获取商品列表（用于前台页面）
 */
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await shopifyService.getProducts();
    res.json({ products });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: '获取商品列表失败: ' + error.message });
  }
};

/**
 * 获取带中文翻译的商品列表（用于套餐管理）
 */
export const getProductsWithTranslations = async (req: Request, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // 获取 Shopify 商品
    const products = await shopifyService.getProducts();
    
    // 获取所有映射
    const mappings = await prisma.productNameMapping.findMany();
    const mappingMap = new Map(
      mappings.map(m => [m.shopifyProductId, m.chineseName])
    );
    
    // 为每个商品添加中文名称
    const productsWithTranslations = products.map(product => {
      const productChineseName = mappingMap.get(product.id.toString()) || product.title;
      return {
        ...product,
        chineseTitle: productChineseName,
        variants: product.variants.map(variant => {
          const variantFullName = `${product.title}${variant.title !== 'Default Title' ? ' - ' + variant.title : ''}`;
          return {
            ...variant,
            chineseTitle: productChineseName !== product.title 
              ? `${productChineseName}${variant.title !== 'Default Title' ? ' - ' + variant.title : ''}`
              : variantFullName,
            originalTitle: variantFullName, // 保留原始英文名称
          };
        }),
      };
    });
    
    await prisma.$disconnect();
    res.json({ products: productsWithTranslations, mappings });
  } catch (error: any) {
    console.error('Error fetching products with translations:', error);
    res.status(500).json({ error: '获取商品列表失败: ' + error.message });
  }
};

