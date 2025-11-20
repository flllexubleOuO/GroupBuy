import { Router } from 'express';
import publicRoutes from './public';
import adminRoutes from './admin';

const router = Router();

// 前台路由
router.use(publicRoutes);

// 后台路由
router.use(adminRoutes);

export default router;

