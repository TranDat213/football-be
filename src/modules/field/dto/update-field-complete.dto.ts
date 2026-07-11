import 'reflect-metadata';
import { TimeSlotLabel, YardType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// ─── Nested DTOs ───────────────────────────────────────────────────────────────

export class UpdateFieldImageCompleteDto {
  @IsString()
  url!: string;

  @IsString()
  publicId!: string;

  @IsBoolean()
  isCover!: boolean;

  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class UpdatePriceRuleCompleteDto {
  @IsNumber()
  @Min(0)
  price!: number;
}

export class UpdateFieldTimeSlotCompleteDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be a valid time in HH:mm format',
  })
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be a valid time in HH:mm format',
  })
  endTime!: string;

  @IsEnum(TimeSlotLabel)
  label!: TimeSlotLabel;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ValidateNested()
  @Type(() => UpdatePriceRuleCompleteDto)
  priceRule!: UpdatePriceRuleCompleteDto;
}

export class UpdateYardCompleteDto {
  /** Nếu có id → update yard đó; nếu không → tạo mới */
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  name!: string;

  @IsEnum(YardType)
  type!: YardType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFieldTimeSlotCompleteDto)
  timeSlots!: UpdateFieldTimeSlotCompleteDto[];
}

// ─── Aggregate Root DTO ────────────────────────────────────────────────────────

export class UpdateFootballFieldCompleteDto {
  // ── Field info — all optional ────────────────────────────────────────────────
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  ward?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'openTime must be a valid time in HH:mm format',
  })
  openTime?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'closeTime must be a valid time in HH:mm format',
  })
  closeTime?: string;

  // ── Images — optional ────────────────────────────────────────────────────────
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFieldImageCompleteDto)
  @IsOptional()
  images?: UpdateFieldImageCompleteDto[];

  // ── Yards — optional ─────────────────────────────────────────────────────────
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateYardCompleteDto)
  @IsOptional()
  yards?: UpdateYardCompleteDto[];
}
