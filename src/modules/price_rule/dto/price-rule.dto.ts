import 'reflect-metadata';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateFieldPriceRuleDto {
  @IsString()
  timeSlotId!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}

export class UpdateFieldPriceRuleDto {
  @IsString()
  @IsOptional()
  timeSlotId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;
}
