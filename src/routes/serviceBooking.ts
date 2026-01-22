import { Router } from 'express';
import { showServiceBookingHome } from '../controllers/serviceBookingController';

const router = Router();

// Service Booking module (Phase 2 extension entry)
router.get('/service-booking', showServiceBookingHome);

export default router;

