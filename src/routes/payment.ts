import { Router } from 'express';
import { requireUserAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { uploadWithS3 } from '../middlewares/upload';
import { showPaymentPage, submitPayment } from '../controllers/paymentController';

const router = Router();

router.get('/payment', requireUserAuth, asyncHandler(showPaymentPage));
router.post('/payment/:orderId', requireUserAuth, uploadWithS3, asyncHandler(submitPayment));

export default router;

