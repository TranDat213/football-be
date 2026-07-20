import { NextFunction, Request, Response } from 'express';
import { BookingService } from './booking.service';
import { CreateBookingDto, CreateOfflineBookingDto } from '../dto/booking.dto';
import { toPaginatedResult } from '@/utils/pagination';

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
    const { status, bookingDate, startTime, category, yardType, footballFieldId } = req.query;

    const result = await this.bookingService.getMyBookings(userId, {
      page,
      limit,
      status,
      bookingDate,
      startTime,
      category,
      yardType,
      footballFieldId,
    });

    return res.status(200).json({
      message: 'Danh sách đơn đặt sân của bạn',
      ...toPaginatedResult(result.data, result.total, page, limit),
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
    const { status, bookingDate, startTime, category, yardType, footballFieldId } = req.query;

    const result = await this.bookingService.getOwnerBookings(ownerId, {
      page,
      limit,
      status,
      bookingDate,
      startTime,
      category,
      yardType,
      footballFieldId,
    });

    return res.status(200).json({
      message: 'Danh sách đơn đặt sân dành cho chủ sân',
      ...toPaginatedResult(result.data, result.total, page, limit),
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
  async cancelBooking(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user?.id as string;
    const bookingId = req.params.id as string;
    const { reason } = req.body;

    const result = await this.bookingService.cancelBooking(bookingId, userId, reason);

    return res.status(200).json(result);
  }

  async createOfflineBooking(req: Request, res: Response, _next: NextFunction) {
    const ownerId = req.user?.id as string;
    const fieldYardId = req.params.fieldYardId as string;
    const data = req.body as CreateOfflineBookingDto;

    const booking = await this.bookingService.createOfflineBooking(ownerId, fieldYardId, data);

    return res.status(201).json({
      message: 'Đã khoá khung giờ do khách đặt ngoài',
      data: booking,
    });
  }

  async getBookingsForCreateCasual(req: Request, res: Response, _next: NextFunction) {
    const userId = req.user?.id as string;
    const bookings = await this.bookingService.getBookingsForCreateCasual(userId);
    return res.status(200).json({
      message: 'Danh sách đơn đặt sân đủ điều kiện tạo trận vãng lai',
      data: bookings,
    });
  }

  async ownerCancelBooking(req: Request, res: Response, _next: NextFunction) {
    const ownerId = req.user?.id as string;
    const bookingId = req.params.id as string;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Lý do hủy không được để trống' });
    }

    const result = await this.bookingService.ownerCancelBooking(ownerId, bookingId, reason.trim());
    return res.status(200).json(result);
  }
}
