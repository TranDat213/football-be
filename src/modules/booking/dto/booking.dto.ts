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

  @IsNotEmpty({ message: 'Vui lòng chọn phương thức thanh toán' })
  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod!: PaymentMethod; // CASH => trả sau, không hết hạn | MOMO/VNPAY/BANK_TRANSFER => giữ chỗ tạm, có TTL

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

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}

