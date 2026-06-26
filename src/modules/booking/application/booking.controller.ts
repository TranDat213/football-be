import { NextFunction, Request, Response } from 'express';
import { BookingService } from './booking.service';
import { CreateBookingDto } from '../dto/booking.dto';

export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  async createBooking(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user?.id as string;
    const data = req.body as CreateBookingDto;

    const booking = await this.bookingService.createBooking(userId, data);

    return res.status(201).json({
      message: 'Đặt sân thành công, vui lòng tiến hành thanh toán',
      data: booking,
    });
  }

  async getMyBookings(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user?.id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const bookings = await this.bookingService.getMyBookings(userId, {
      page,
      limit,
      status,
    });

    return res.status(200).json({
      message: 'Danh sách đơn đặt sân của bạn',
      data: bookings,
    });
  }

  async getBookingById(req: Request, res: Response, _next: NextFunction) {
    const id = req.params.id as string;
    const booking = await this.bookingService.getBookingById(id);

    return res.status(200).json({
      message: 'Chi tiết đơn đặt sân',
      data: booking,
    });
  }

  async getOwnerBookings(req: Request, res: Response, _next: NextFunction) {
    const ownerId = req.user?.id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const bookings = await this.bookingService.getOwnerBookings(ownerId, {
      page,
      limit,
      status,
    });

    return res.status(200).json({
      message: 'Danh sách đơn đặt sân dành cho chủ sân',
      data: bookings,
    });
  }

  async countTotalBookingByOwner(
    req: Request,
    res: Response,
    _next: NextFunction,
  ) {
    const ownerId = req.user?.id as string;
    const count = await this.bookingService.countTotalBookingByOwner(ownerId);
    return res.status(200).json({
      message: 'Tổng số đơn đặt sân của chủ sân',
      data: count,
    });
  }

  async getBookingByDate(req: Request, res: Response, _next: NextFunction) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const date = new Date(req.query.date as string);
    const bookings = await this.bookingService.getBookingByDate(date,page, limit);
    return res.status(200).json({
      message: 'Danh sách đơn đặt sân hôm nay',
      data: bookings,
    });
  }

  async countBookingByDate(req: Request, res: Response, _next: NextFunction) {
    const date = new Date(req.query.date as string);
    const count = await this.bookingService.countBookingByDate(date);
    return res.status(200).json({
      message: 'Tổng số đơn đặt sân hôm nay',
      data: count,
    });
  }
}
