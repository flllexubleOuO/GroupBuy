import { Router } from 'express';
import { showAccount } from '../controllers/accountController';
import { requireUserAuth } from '../middlewares/auth';

const router = Router();

router.get('/account', requireUserAuth, showAccount);

export default router;

