import { Router } from 'express';
import {
  logout,
  showOrders,
  showOrderDetail,
  getProducts,
  getProductsWithTranslations,
} from '../controllers/adminController';
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
} from '../controllers/orderController';
import {
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
} from '../controllers/packageController';
import {
  getAllMappings,
  getMappingById,
  upsertMapping,
  deleteMapping,
  batchCreateMappings,
} from '../controllers/productMappingController';
import { requireAuth, redirectIfAuthenticated } from '../middlewares/auth';

const router = Router();

// Logout (admin)
router.post('/admin/logout', requireAuth, logout);

// 订单列表页面
router.get('/admin/orders', requireAuth, showOrders);

// 订单详情页面
router.get('/admin/orders/:id', requireAuth, showOrderDetail);

// 套餐管理页面
router.get('/admin/packages', requireAuth, (req, res) => {
  res.render('admin/packages');
});

// 商品名称映射管理页面
router.get('/admin/product-mappings', requireAuth, (req, res) => {
  res.render('admin/product-mappings');
});

// API 接口 - 订单
router.get('/admin/api/orders', requireAuth, getOrders);
router.get('/admin/api/orders/:id', requireAuth, getOrderById);
router.patch('/admin/api/orders/:id/status', requireAuth, updateOrderStatus);
router.delete('/admin/api/orders/:id', requireAuth, deleteOrder);

// API 接口 - 套餐
router.get('/admin/api/packages', requireAuth, getAllPackages);
router.get('/admin/api/packages/:id', requireAuth, getPackageById);
router.post('/admin/api/packages', requireAuth, createPackage);
router.patch('/admin/api/packages/:id', requireAuth, updatePackage);
router.delete('/admin/api/packages/:id', requireAuth, deletePackage);

// API 接口 - 商品名称映射
router.get('/admin/api/product-mappings', requireAuth, getAllMappings);
router.get('/admin/api/product-mappings/:id', requireAuth, getMappingById);
router.post('/admin/api/product-mappings', requireAuth, upsertMapping);
router.patch('/admin/api/product-mappings/:id', requireAuth, upsertMapping);
router.delete('/admin/api/product-mappings/:id', requireAuth, deleteMapping);
router.post('/admin/api/product-mappings/batch', requireAuth, batchCreateMappings);

// API 接口 - 商品（用于套餐管理）
router.get('/admin/api/products', requireAuth, getProducts);
router.get('/admin/api/products-with-translations', requireAuth, getProductsWithTranslations);

export default router;
