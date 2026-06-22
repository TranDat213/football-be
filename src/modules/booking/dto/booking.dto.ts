import { BookingStatus, PaymentStatus } from '@prisma/client';
import { IsDateString, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

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

  @IsOptional()
  @IsString()
  note?: string;
}

export interface BookingResponseDto {
  id: string;
  userId: string;
  fieldYardId: string;
  bookingDate: Date;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  note?: string | null;
  createdAt: Date;
}
