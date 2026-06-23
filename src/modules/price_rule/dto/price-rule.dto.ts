import 'reflect-metadata';
import {
  IsInt,
  Max,
  Min,
  IsString,
  Matches,
  IsOptional,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  IsNumber,
  IsDateString,
} from 'class-validator';

@ValidatorConstraint({ name: 'isBeforeTime', async: false })
export class IsBeforeTimeConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: string, args: ValidationArguments) {
    const object = args.object as any;
    const compareValue = object[args.constraints[0]];
    if (!propertyValue || !compareValue) return true;
    return propertyValue < compareValue;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be before ${args.constraints[0]}`;
  }
}

export class CreateFieldPriceRuleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  dayOfWeek?: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be a valid time in HH:mm format',
  })
  @Validate(IsBeforeTimeConstraint, ['endTime'])
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be a valid time in HH:mm format',
  })
  endTime!: string;

  @IsDateString()
  @IsOptional()
  specialDate?: string;

  @IsNumber()
  price!: number;

  @IsString()
  @IsOptional()
  label?: string;
}

export class UpdateFieldPriceRuleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  dayOfWeek?: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be a valid time in HH:mm format',
  })
  @IsOptional()
  startTime?: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be a valid time in HH:mm format',
  })
  @IsOptional()
  endTime?: string;

  @IsDateString()
  @IsOptional()
  specialDate?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  label?: string;
}
