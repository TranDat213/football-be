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
} from 'class-validator';

@ValidatorConstraint({ name: 'isBeforeTime', async: false })
export class IsBeforeTimeConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: string, args: ValidationArguments) {
    const object = args.object as any;
    const compareValue = object[args.constraints[0]];
    if (!propertyValue || !compareValue) return true; // Let other validators handle absence
    // propertyValue is openTime, compareValue is closeTime
    // Assuming HH:mm format
    return propertyValue < compareValue;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be before ${args.constraints[0]}`;
  }
}

export class CreateFieldOperatingHourDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'openTime must be a valid time in HH:mm format',
  })
  @Validate(IsBeforeTimeConstraint, ['closeTime'])
  openTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'closeTime must be a valid time in HH:mm format',
  })
  closeTime!: string;
}

export class UpdateFieldOperatingHourDto {
  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  dayOfWeek?: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'openTime must be a valid time in HH:mm format',
  })
  @IsOptional()
  openTime?: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'closeTime must be a valid time in HH:mm format',
  })
  @IsOptional()
  closeTime?: string;
}
