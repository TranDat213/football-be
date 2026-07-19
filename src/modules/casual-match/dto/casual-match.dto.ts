import {
  IsDecimal,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CasualMatchStatus, SkillLevel, TeamMode, TeamSide, Visibility } from '@prisma/client';

// ─── Create ───────────────────────────────────────────────────────────────────

export class CreateCasualMatchDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  totalSlots!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  slotPrice?: number;

  @IsOptional()
  @IsEnum(SkillLevel)
  skillLevel?: SkillLevel;

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @IsOptional()
  @IsEnum(TeamMode)
  teamMode?: TeamMode;

  @IsOptional()
  @IsISO8601()
  joinDeadline?: string;
}

// ─── Update (owner editable fields only) ──────────────────────────────────────

export class UpdateCasualMatchDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  slotPrice?: number;

  @IsOptional()
  @IsISO8601()
  joinDeadline?: string;

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @IsOptional()
  @IsEnum(TeamMode)
  teamMode?: TeamMode;

  @IsOptional()
  @IsEnum(SkillLevel)
  skillLevel?: SkillLevel;
}

// ─── Status change ─────────────────────────────────────────────────────────────

export class UpdateMatchStatusDto {
  @IsEnum(CasualMatchStatus)
  status!: CasualMatchStatus;
}

// ─── Join ─────────────────────────────────────────────────────────────────────

export class JoinCasualMatchDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  slotCount?: number;

  @IsOptional()
  @IsEnum(TeamSide)
  selectedTeam?: TeamSide;
}

// ─── Payment init ──────────────────────────────────────────────────────────────

export class InitParticipantPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentMethod!: 'VNPAY';  // extend later
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export class CancelParticipationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── Browse query ──────────────────────────────────────────────────────────────

export class BrowseCasualMatchQuery {
  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsUUID()
  footballFieldId?: string;

  @IsOptional()
  @IsISO8601()
  bookingDate?: string;

  @IsOptional()
  @IsEnum(SkillLevel)
  skillLevel?: SkillLevel;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
