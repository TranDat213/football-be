import { Router } from 'express';
import { BookingController } from '../modules/booking/application/booking.controller';
import { BookingService } from '../modules/booking/application/booking.service';
import { PrismaBookingRepository } from '../modules/booking/infrastructure/prisma-booking.repository';
import { EmailService } from '../modules/booking/infrastructure/email.service';
import { RefundService } from '../modules/payment/application/refund.service';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/authenticate.middleware';
import { authorize } from '../middleware/authorize.middlerware';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { validateDto } from '../middleware/validate-dto.middleware';
import { UserRole } from '@prisma/client';
import { CreateBookingDto } from '../modules/booking/dto/booking.dto';

const bookingRouter = Router();

// Dependencies injection
const bookingRepository = new PrismaBookingRepository(prisma);
const emailService = new EmailService();
const refundService = new RefundService(prisma);
const bookingService = new BookingService(
  bookingRepository,
  emailService,
  prisma,
  refundService,
);
const bookingController = new BookingController(bookingService);

// User Routes
bookingRouter.post(
  '/',
  authenticate,
  authorize(UserRole.USER),
  validateDto(CreateBookingDto),
  asyncHandler(bookingController.createBooking.bind(bookingController)),
);

bookingRouter.post(
  '/:id/cancel',
  authenticate,
  asyncHandler(bookingController.cancelBooking.bind(bookingController)),
);

bookingRouter.get(
  '/my-bookings',
  authenticate,
  asyncHandler(bookingController.getMyBookings.bind(bookingController)),
);

bookingRouter.get(
  '/:id',
  authenticate,
  asyncHandler(bookingController.getBookingById.bind(bookingController)),
);

// Owner Routes
bookingRouter.get(
  '/owner/bookings',
  authenticate,
  authorize(UserRole.OWNER),
  asyncHandler(bookingController.getOwnerBookings.bind(bookingController)),
);

bookingRouter.get(
  '/owner/total',
  authenticate,
  authorize(UserRole.OWNER),
  asyncHandler(
    bookingController.countTotalBookingByOwner.bind(bookingController),
  ),
);

bookingRouter.get(
  '/booking-date',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(bookingController.getBookingByDate.bind(bookingController)),
);

bookingRouter.get(
  '/booking-date-count',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(bookingController.countBookingByDate.bind(bookingController)),
);

export default bookingRouter;
