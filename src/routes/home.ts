import { Router } from 'express';
import { showHome } from '../controllers/homeController';

const router = Router();

// Home Page (new unified entry)
router.get('/home', showHome);

// User login placeholder (Phase 2)
router.get('/user-login', (req, res) => {
  res.redirect('/login');
});

export default router;

