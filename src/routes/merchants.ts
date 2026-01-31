import { Router } from 'express';
import { showMerchantDetail, showMerchantSearch } from '../controllers/merchantPublicController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Public merchant browse/search
router.get('/merchants', asyncHandler(showMerchantSearch));
router.get('/merchants/:id', asyncHandler(showMerchantDetail));

export default router;

