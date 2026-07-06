import 'reflect-metadata';
import {
  IsInt,
  IsEnum,
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
import { TimeSlotLabel } from '@prisma/client';

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

export class CreateFieldTimeSlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

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

  @IsEnum(TimeSlotLabel)
  label!: TimeSlotLabel;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class UpdateFieldTimeSlotDto {
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

  @IsEnum(TimeSlotLabel)
  @IsOptional()
  label?: TimeSlotLabel;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export { CreateFieldTimeSlotDto as CreateFieldOperatingHourDto };
export { UpdateFieldTimeSlotDto as UpdateFieldOperatingHourDto };
