import { Router } from 'express';
import { requireMerchant } from '../middlewares/auth';
import { uploadWithS3Field } from '../middlewares/upload';
import { asyncHandler } from '../utils/asyncHandler';
import {
  showMerchantDashboard,
  updateMerchantProfile,
  createMerchantPackage,
  deleteMerchantPackage,
  createMerchantService,
  deleteMerchantService,
  onboardToMerchant,
  showMerchantUpgrade,
  showMerchantPackageDetail,
  showMerchantServiceDetail,
} from '../controllers/merchantController';
import { requireUserAuth } from '../middlewares/auth';

const router = Router();

// Upgrade page (separate page from /account)
router.get('/merchant/upgrade', requireUserAuth, asyncHandler(showMerchantUpgrade));

// Upgrade normal user -> merchant (merchant is a superset of user)
router.post('/merchant/onboard', requireUserAuth, asyncHandler(onboardToMerchant));

router.get('/merchant/dashboard', requireMerchant, asyncHandler(showMerchantDashboard));
router.post(
  '/merchant/profile',
  requireMerchant,
  uploadWithS3Field('store_image'),
  asyncHandler(updateMerchantProfile)
);

router.get('/merchant/packages/:id', requireMerchant, asyncHandler(showMerchantPackageDetail));
router.post('/merchant/packages', requireMerchant, uploadWithS3Field('image'), asyncHandler(createMerchantPackage));
router.post('/merchant/packages/:id/delete', requireMerchant, asyncHandler(deleteMerchantPackage));

router.get('/merchant/services/:id', requireMerchant, asyncHandler(showMerchantServiceDetail));
router.post('/merchant/services', requireMerchant, uploadWithS3Field('image'), asyncHandler(createMerchantService));
router.post('/merchant/services/:id/delete', requireMerchant, asyncHandler(deleteMerchantService));

export default router;

