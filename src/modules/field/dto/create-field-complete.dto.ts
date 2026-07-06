import 'reflect-metadata';
import { TimeSlotLabel, YardType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// ─── Nested DTOs ───────────────────────────────────────────────────────────────

export class FieldImageCompleteDto {
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

export class PriceRuleCompleteDto {

  @IsNumber()
  @Min(0)
  price!: number;
}

export class FieldTimeSlotCompleteDto {
  @IsString()
  @IsOptional()
  tempId?: string;

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
  @Type(() => PriceRuleCompleteDto)
  priceRule!: PriceRuleCompleteDto;
}

export class YardCompleteDto {
  @IsString()
  name!: string;

  @IsEnum(YardType)
  type!: YardType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldTimeSlotCompleteDto)
  timeSlots!: FieldTimeSlotCompleteDto[];
}

// ─── Aggregate Root DTO ────────────────────────────────────────────────────────

export class CreateFootballFieldCompleteDto {
  // ── Field info ──────────────────────────────────────────────────────────────
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  categoryId!: string;

  @IsString()
  address!: string;

  @IsString()
  province!: string;

  @IsString()
  district!: string;

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

  // ── Images ──────────────────────────────────────────────────────────────────
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldImageCompleteDto)
  images!: FieldImageCompleteDto[];

  // ── Yards ───────────────────────────────────────────────────────────────────
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => YardCompleteDto)
  yards!: YardCompleteDto[];
}
