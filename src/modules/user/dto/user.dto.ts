import { IsEmail, IsOptional, IsString, Matches } from "class-validator";

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