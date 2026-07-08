import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FootballFieldUpdateRequestStatus } from '@prisma/client';
import { UpdateFootballFieldCompleteDto } from '@/modules/field/dto/update-field-complete.dto';

export class CreateFootballFieldUpdateRequestDto {
  @ValidateNested()
  @Type(() => UpdateFootballFieldCompleteDto)
  @IsNotEmpty()
  payload!: UpdateFootballFieldCompleteDto;
}

export class ApproveFootballFieldUpdateRequestDto {
  // Can be empty, but keeping for future expansion
}

export class RejectFootballFieldUpdateRequestDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class ListFootballFieldUpdateRequestQueryDto {
  @IsEnum(FootballFieldUpdateRequestStatus)
  @IsOptional()
  status?: FootballFieldUpdateRequestStatus;
}
