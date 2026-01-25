import { Router } from 'express';
import {
  showLogin,
  login,
  showRegister,
  register,
  logout,
  showAdminLogin,
  adminLogin,
} from '../controllers/authController';
import { redirectIfAuthenticated } from '../middlewares/auth';

const router = Router();

// User / merchant auth
router.get('/login', showLogin);
router.post('/login', login);
router.get('/register', showRegister);
router.post('/register', register);
router.post('/logout', logout);

// Admin dedicated login page
router.get('/admin-login', redirectIfAuthenticated, showAdminLogin);
router.post('/admin-login', redirectIfAuthenticated, adminLogin);

// Backward compatible redirect
router.get('/admin/login', (req, res) => res.redirect('/admin-login'));
router.post('/admin/login', (req, res) => res.redirect(307, '/admin-login'));

export default router;

