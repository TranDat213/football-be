import 'reflect-metadata';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';


export class UpdateFieldPriceRuleDto {
  @IsString()
  @IsOptional()
  timeSlotId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;
}
