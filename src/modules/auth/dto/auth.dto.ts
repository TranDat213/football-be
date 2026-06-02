import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class SignInDto {
    @IsString()
    user_name!: string;

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
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    password!: string;

    @IsString()
    @MinLength(8, { message: 'Confirm password must be at least 8 characters long' })
    confirmPassword!: string;
}

