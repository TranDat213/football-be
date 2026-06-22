import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePaymentUrlDto {
  @IsNotEmpty({ message: 'ID đơn đặt sân không được để trống' })
  @IsString()
  bookingId!: string;
}
