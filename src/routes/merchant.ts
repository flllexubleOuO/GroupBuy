import { Router } from 'express';
import { requireMerchant } from '../middlewares/auth';
import {
  showMerchantDashboard,
  updateMerchantProfile,
  createMerchantPackage,
  deleteMerchantPackage,
  createMerchantService,
  deleteMerchantService,
  onboardToMerchant,
} from '../controllers/merchantController';
import { requireUserAuth } from '../middlewares/auth';

const router = Router();

// Upgrade normal user -> merchant (merchant is a superset of user)
router.post('/merchant/onboard', requireUserAuth, onboardToMerchant);

router.get('/merchant/dashboard', requireMerchant, showMerchantDashboard);
router.post('/merchant/profile', requireMerchant, updateMerchantProfile);

router.post('/merchant/packages', requireMerchant, createMerchantPackage);
router.post('/merchant/packages/:id/delete', requireMerchant, deleteMerchantPackage);

router.post('/merchant/services', requireMerchant, createMerchantService);
router.post('/merchant/services/:id/delete', requireMerchant, deleteMerchantService);

export default router;

