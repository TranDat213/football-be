import { Router } from 'express';
import { PaymentController } from '../modules/payment/application/payment.controller';
import { RefundController } from '../modules/payment/application/refund.controller';
import { VNPayService } from '../modules/payment/application/vnpay.service';
import { PaymentService } from '../modules/payment/application/payment.service';
import { RefundService } from '../modules/payment/application/refund.service';
import { BookingService } from '../modules/booking/application/booking.service';
import { PrismaBookingRepository } from '../modules/booking/infrastructure/prisma-booking.repository';
import { EmailService } from '../modules/booking/infrastructure/email.service';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/authenticate.middleware';
import { authorize } from '../middleware/authorize.middlerware';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { UserRole } from '@prisma/client';

const paymentRouter = Router();

// Dependencies injection
const bookingRepository = new PrismaBookingRepository(prisma);
const emailService = new EmailService();
const vnpayService = new VNPayService();
const paymentService = new PaymentService(prisma, vnpayService, emailService);
const refundService = new RefundService(prisma);
const bookingService = new BookingService(bookingRepository, emailService, prisma, refundService);
const paymentController = new PaymentController(vnpayService, paymentService, bookingService);
const refundController = new RefundController(refundService);

// ─── Payment Routes ───────────────────────────────────────────────────────────

// POST /payments/create — create VNPay URL (authenticated)
paymentRouter.post(
  '/create',
  authenticate,
  asyncHandler(paymentController.createPayment.bind(paymentController))
);

// GET /payments/vnpay/ipn — VNPay server-to-server callback (public)
paymentRouter.get(
  '/vnpay/ipn',
  asyncHandler(paymentController.handleVNPayIPN.bind(paymentController))
);

// GET /payments/vnpay/return — browser redirect from VNPay (public, verify only)
paymentRouter.get(
  '/vnpay/return',
  asyncHandler(paymentController.handleVNPayReturn.bind(paymentController))
);

// GET /payments/admin/all — admin list all payments
paymentRouter.get(
  '/admin/all',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(paymentController.getAllPaymentsAdmin.bind(paymentController))
);

// GET /payments/:bookingId — get payment for a booking (authenticated)
paymentRouter.get(
  '/:bookingId',
  authenticate,
  asyncHandler(paymentController.getPaymentByBookingId.bind(paymentController))
);

// ─── Refund Routes ────────────────────────────────────────────────────────────

// GET /refunds/:bookingId — get refund info (authenticated)
paymentRouter.get(
  '/refunds/:bookingId',
  authenticate,
  asyncHandler(refundController.getRefundByBookingId.bind(refundController))
);

// PATCH /refunds/:id/confirm — admin confirm refund
paymentRouter.patch(
  '/refunds/:id/confirm',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(refundController.confirmRefund.bind(refundController))
);

export default paymentRouter;
