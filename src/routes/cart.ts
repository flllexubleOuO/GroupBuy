import { Router } from 'express';
import { requireUserAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { showCartPage, setCartFromSelection, updateCartItem, clearCart, checkoutCart } from '../controllers/cartController';

const router = Router();

router.get('/cart', requireUserAuth, asyncHandler(showCartPage));
router.post('/cart/set', asyncHandler(setCartFromSelection)); // can be called before login; cart stored in session
router.post('/cart/item', asyncHandler(updateCartItem));
router.post('/cart/clear', asyncHandler(clearCart));
router.post('/cart/checkout', requireUserAuth, asyncHandler(checkoutCart));

export default router;

