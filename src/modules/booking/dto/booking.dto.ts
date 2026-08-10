import { BookingSource, BookingStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty({ message: 'ID sân con không được để trống' })
  @IsString()
  fieldYardId!: string;

  @IsNotEmpty({ message: 'Ngày đặt sân không được để trống' })
  @IsDateString({}, { message: 'Ngày đặt sân không hợp lệ' })
  bookingDate!: string; // ISO Date string YYYY-MM-DD

  @IsNotEmpty({ message: 'Giờ bắt đầu không được để trống' })
  @Matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, { message: 'Giờ bắt đầu phải theo định dạng HH:mm' })
  startTime!: string;   // HH:mm

  @IsNotEmpty({ message: 'Giờ kết thúc không được để trống' })
  @Matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, { message: 'Giờ kết thúc phải theo định dạng HH:mm' })
  endTime!: string;     // HH:mm

  // Chỉ hỗ trợ VNPAY — CASH chuyển sang createOfflineBooking
  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateOfflineBookingDto {
  @IsNotEmpty({ message: 'Ngày đặt sân không được để trống' })
  @IsDateString({}, { message: 'Ngày đặt sân không hợp lệ' })
  bookingDate!: string;

  @IsNotEmpty({ message: 'Giờ bắt đầu không được để trống' })
  @Matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, { message: 'Giờ bắt đầu phải theo định dạng HH:mm' })
  startTime!: string;

  @IsNotEmpty({ message: 'Giờ kết thúc không được để trống' })
  @Matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, { message: 'Giờ kết thúc phải theo định dạng HH:mm' })
  endTime!: string;

  // Dùng khi chủ sân tạo offline thay khách
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  // Ghi chú từ user khi chọn "Tiền mặt tại sân"
  @IsOptional()
  @IsString()
  note?: string;
}
