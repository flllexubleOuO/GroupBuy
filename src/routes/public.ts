import { Router } from 'express';
import { createOrder, getOrdersByPhone } from '../controllers/orderController';
import { getActivePackages } from '../controllers/packageController';
import { getProducts } from '../controllers/adminController';
import { uploadWithS3 } from '../middlewares/upload';
import { proxyS3Image } from '../controllers/imageController';
import { config } from '../config';

const router = Router();

// 获取套餐列表（用于前台页面）
router.get('/api/packages', getActivePackages);

// 获取商品列表（用于套餐创建时选择）
router.get('/api/products', getProducts);

// 创建订单（使用 S3 上传中间件）
router.post('/api/orders', uploadWithS3, createOrder);

// 根据手机号查询订单（公开接口）
router.get('/api/orders/query', getOrdersByPhone);

// S3 图片代理（仅当启用 S3 时）
if (config.s3.enabled) {
  router.get('/api/images/s3/:key(*)', proxyS3Image);
}

export default router;

