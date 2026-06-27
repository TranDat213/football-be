import { OwnerRegistrationStatus, UserRole, UserStatus } from "@prisma/client";
import { IsEmail, IsEnum, IsOptional, IsString, Matches } from "class-validator";

export class UpdateProfileDto{
    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    @Matches(/^(0|\+84)[3-9][0-9]{8}$/, {
        message: 'Phone number is invalid',
      })
    phone?: string;
}

export class AddOwnerDto {

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  @IsString()
  email!: string;

  @IsString()
  @Matches(/^(0|\+84)[3-9][0-9]{8}$/, {
    message: 'Phone number is invalid',
  })
  phone!: string;

  @IsString()
  @IsOptional()
  password?: string;
}

export class UpdateRoleDto {

  @IsString()
  @IsEnum(UserRole)
  role!: UserRole;
}

export class UpdateUserStatusDto {
  @IsString()
  @IsEnum(UserStatus)
  status!: UserStatus;
}

export class OwnerRegisterDto {
  @IsString()
  @IsOptional()
  user_id?: string;

  @IsString()
  first_name!: string;

  @IsString()
  last_name!: string;

  @IsEmail()
  @IsString()
  email!: string;

  @IsString()
  @Matches(/^(0|\+84)[3-9][0-9]{8}$/, {
    message: 'Phone number is invalid',
  })
  phone!: string;

  @IsString()
  stadium_name!: string;

  @IsString()
  address!: string;

}

export class UpdateOwnerRegisterStatusDto {
  @IsString()
  @IsEnum(OwnerRegistrationStatus)
  status!: OwnerRegistrationStatus;
}