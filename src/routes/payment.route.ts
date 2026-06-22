import { Router } from 'express';
import { PaymentController } from '../modules/payment/application/payment.controller';
import { VNPayService } from '../modules/payment/application/vnpay.service';
import { BookingService } from '../modules/booking/application/booking.service';
import { PrismaBookingRepository } from '../modules/booking/infrastructure/prisma-booking.repository';
import { EmailService } from '../modules/booking/infrastructure/email.service';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/authenticate.middleware';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { validateDto } from '../middleware/validate-dto.middleware';
import { CreatePaymentUrlDto } from '../modules/payment/dto/payment.dto';

const paymentRouter = Router();

// Dependencies injection
const bookingRepository = new PrismaBookingRepository(prisma);
const emailService = new EmailService();
const bookingService = new BookingService(bookingRepository, emailService, prisma);
const vnpayService = new VNPayService();
const paymentController = new PaymentController(vnpayService, bookingService);

paymentRouter.post(
  '/vnpay/create',
  authenticate,
  validateDto(CreatePaymentUrlDto),
  asyncHandler(paymentController.createVNPayUrl.bind(paymentController))
);

paymentRouter.get(
  '/vnpay/ipn',
  asyncHandler(paymentController.handleVNPayIPN.bind(paymentController))
);

export default paymentRouter;
