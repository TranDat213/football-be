import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PayoutStatus } from '@prisma/client';

export class RequestPayoutDto {
  @IsNotEmpty({ message: 'Số tiền không được để trống' })
  @IsNumber({}, { message: 'Số tiền phải là số' })
  @Min(10000, { message: 'Số tiền tối thiểu là 10.000 VND' })
  amount!: number;

  @IsNotEmpty({ message: 'Số tài khoản không được để trống' })
  @IsString()
  bankAccount!: string;

  @IsNotEmpty({ message: 'Tên ngân hàng không được để trống' })
  @IsString()
  bankName!: string;
}

export class UpdatePayoutStatusDto {
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsEnum(PayoutStatus, { message: 'Trạng thái không hợp lệ' })
  status!: PayoutStatus;

  @IsOptional()
  @IsString()
  transactionId?: string;
}
