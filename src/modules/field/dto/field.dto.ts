import 'reflect-metadata';
import { FieldStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class FieldDto {
  @IsString()
  category_id!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

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
  open_time!: string;

  @IsString()
  close_time!: string;
}

export class UpdateFieldDto {
  @IsString()
  @IsOptional()
  category_id?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

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
  open_time?: string;

  @IsString()
  @IsOptional()
  close_time?: string;
}

export class UpdateFieldStatusDto {
  @IsString()
  @IsEnum(FieldStatus)
  status!: FieldStatus;
}

export class CreateFieldImageDto {
  @IsString()
  footballFieldId!: string;

  @Type(() => Number)
  @IsNumber()
  sortOrder!: number;

  @Type(() => Boolean)
  @IsBoolean()
  isCover!: boolean;
}

export class UpdateFieldImageDto {

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isCover?: boolean;
}
