import { Router } from 'express';
import homeRoutes from './home';
import publicRoutes from './public';
import adminRoutes from './admin';
import serviceBookingRoutes from './serviceBooking';
import authRoutes from './auth';
import accountRoutes from './account';
import merchantRoutes from './merchant';
import merchantsRoutes from './merchants';
import cartRoutes from './cart';
import paymentRoutes from './payment';

const router = Router();

// Auth routes
router.use(authRoutes);

// Home / Phase 2 extension routes
router.use(homeRoutes);
router.use(serviceBookingRoutes);
router.use(merchantsRoutes);
router.use(cartRoutes);
router.use(paymentRoutes);
router.use(accountRoutes);
router.use(merchantRoutes);

// 前台路由
router.use(publicRoutes);

// 后台路由
router.use(adminRoutes);

export default router;

