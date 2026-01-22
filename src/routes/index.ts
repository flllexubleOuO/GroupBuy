import { Router } from 'express';
import homeRoutes from './home';
import publicRoutes from './public';
import adminRoutes from './admin';
import serviceBookingRoutes from './serviceBooking';

const router = Router();

// Home / Phase 2 extension routes
router.use(homeRoutes);
router.use(serviceBookingRoutes);

// 前台路由
router.use(publicRoutes);

// 后台路由
router.use(adminRoutes);

export default router;

