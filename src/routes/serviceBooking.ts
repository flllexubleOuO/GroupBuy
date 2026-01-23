import { Router } from 'express';
import {
  createServiceBooking,
  listServices,
  showBookingSuccess,
  showServiceDetail,
} from '../controllers/serviceBookingController';
import {
  createServiceRequest,
  selectQuote,
  showMerchantDashboard,
  showMerchantRequestDetail,
  showNewRequestForm,
  showUserRequestDetail,
  upsertMerchantQuote,
} from '../controllers/customServiceRequestController';
import { uploadWithS3Field } from '../middlewares/upload';

const router = Router();

// Service Booking module (Phase 2 extension entry)
router.get('/service-booking', listServices);
router.get('/service-booking/services/:id', showServiceDetail);

// Create booking (with optional reference image)
router.post('/service-booking/api/bookings', uploadWithS3Field('reference_image'), createServiceBooking);

// Success page
router.get('/service-booking/bookings/:id/success', showBookingSuccess);

// -------------------------
// Custom service requests (user posts demand, merchants quote)
// -------------------------
router.get('/service-booking/requests/new', showNewRequestForm);
router.post('/service-booking/requests', uploadWithS3Field('reference_image'), createServiceRequest);
router.get('/service-booking/requests/:id', showUserRequestDetail); // requires ?token=
router.post('/service-booking/requests/:id/select', selectQuote); // requires ?token=

// Merchant dashboard (Phase 2 placeholder auth via ?key=)
router.get('/service-booking/merchant', showMerchantDashboard);
router.get('/service-booking/merchant/requests/:id', showMerchantRequestDetail);
router.post('/service-booking/merchant/requests/:id/quote', upsertMerchantQuote);

export default router;

