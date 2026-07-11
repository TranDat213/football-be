import { YardStatus, YardType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateFieldYardDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  field_id?: string;

  @IsString()
  @IsOptional()
  @IsEnum(YardType)
  type?: YardType;

  @IsEnum(YardStatus)
  @IsOptional()
  status?: YardStatus;
}
