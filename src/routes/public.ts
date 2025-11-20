import { Router } from 'express';
import { createOrder, getOrdersByPhone } from '../controllers/orderController';
import { getActivePackages } from '../controllers/packageController';
import { getProducts } from '../controllers/adminController';
import { upload } from '../middlewares/upload';

const router = Router();

// 获取套餐列表（用于前台页面）
router.get('/api/packages', getActivePackages);

// 获取商品列表（用于套餐创建时选择）
router.get('/api/products', getProducts);

// 创建订单
router.post('/api/orders', upload.single('payment_screenshot'), createOrder);

// 根据手机号查询订单（公开接口）
router.get('/api/orders/query', getOrdersByPhone);

export default router;

