import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class SignInDto {
  @IsString()
  @IsOptional()
  user_name?: string;

  @IsString()
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;
}

export class SignUpDto {
  @IsString()
  first_name!: string;

  @IsString()
  last_name!: string;

  @IsString()
  user_name!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString()
  @MinLength(8, {
    message: 'Confirm password must be at least 8 characters long',
  })
  confirmPassword!: string;
}

export class ForgotPasswordDto {
  @IsString()
  @IsOptional()
  user_name?: string;

  @IsString()
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString()
  @MinLength(8, {
    message: 'Confirm password must be at least 8 characters long',
  })
  confirmPassword!: string;
}
export class OAuthDto {
  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  provider!: string;

  @IsString()
  providerId!: string;
}

export class OwnerRegisterDto{
  @IsString()
  @IsOptional()
  user_id?:string;

  @IsString()
  full_name!:string;

  @IsEmail()
  @IsString()
  email!:string;

  @IsString()
  @Matches(/^(0|\+84)[3-9][0-9]{8}$/, {
  message: 'Phone number is invalid',
})
  phone!:string;

  @IsString()
  stadium_name!:string;

  @IsString()
  address!:string;

}