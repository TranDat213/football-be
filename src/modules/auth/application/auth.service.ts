import { OwnerRegistration, User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IAuthRepository, OtpData } from '../domain/auth.repository';
import {
  ForgotPasswordDto,
  OAuthDto,
  RequestOtpDto,
  SignInDto,
  SignUpDto,
  VerifyOtpDto,
} from '../dto/auth.dto';
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
  UnauthorizedException,
} from '@/utils/app-error';
import mailService from './mail.service';
import * as crypto from 'node:crypto';
import { Env } from '@/config/env.config';

export class AuthService {
  constructor(private readonly authRepository: IAuthRepository) {}

  private otpStore = new Map<string, OtpData>();
  private resetTokenStore = new Map<
    string,
    { token: string; expiresAt: number }
  >();

  async signUp(data: SignUpDto): Promise<User> {
    try {
      const {
        first_name,
        last_name,
        user_name,
        email,
        password,
        confirmPassword,
      } = data;
      if (data.user_name) {
        const user = await this.authRepository.findUserByUsername(
          data.user_name,
        );
        if (user) {
          throw new BadRequestException('Username already exists');
        }
      }
      if (data.email) {
        const user = await this.authRepository.findUserByEmail(data.email);
        if (user) {
          throw new BadRequestException('Email already exists');
        }
      }
      if (data.password !== data.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      return await this.authRepository.createUser({
        first_name,
        last_name,
        user_name,
        email,
        password: hashedPassword,
        confirmPassword,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to sign up');
    }
  }

  async signIn(data: SignInDto): Promise<User | null> {
    try {
      if (!data.email && !data.user_name) {
        throw new BadRequestException('Email or username is required');
      }
      if (data.email && !data.user_name) {
        data.user_name = data.email;
      }
      let user: User | null = null;
      if (data.email) {
        user = await this.authRepository.findUserByEmail(data.email);
      } else {
        user = await this.authRepository.findUserByUsername(data.user_name!);
      }
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.password) {
        throw new BadRequestException('User has no password');
      }

      const isPasswordValid = await bcrypt.compare(
        data.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new BadRequestException('Invalid password');
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerException('Failed to login');
    }
  }

  async forgotPassword(data: ForgotPasswordDto): Promise<User> {
    try {
      if (!data.email && !data.user_name) {
        throw new BadRequestException('Email or username is required');
      }
      let user: User | null = null;
      if (data.email) {
        user = await this.authRepository.findUserByEmail(data.email);
      } else {
        user = await this.authRepository.findUserByUsername(data.user_name!);
      }
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.password) {
        throw new BadRequestException('User has no password');
      }

      if (data.password !== data.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const email = data.email ?? user.email;

      this.resetTokenStore.delete(email);
      return await this.authRepository.updatePassword(hashedPassword, user.id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to forgot password');
    }
  }

  async signInByProvider(data: OAuthDto): Promise<User> {
    try {
      const existingByProvider =
        await this.authRepository.findUserByProvider(data);
      if (existingByProvider) {
        return existingByProvider;
      }

      return await this.authRepository.upsertOAuthUser(data);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to sign in by provider');
    }
  }

  async requestOtp(data: RequestOtpDto): Promise<void> {
    try {
      const { email, purpose } = data;
      const existingUser = await this.authRepository.findUserByEmail(email);
      let pendingSignUp: OtpData['pendingSignUp'];

      if (purpose === 'SIGN_UP') {
        if (existingUser) {
          throw new BadRequestException('Email already exists');
        }
        const { first_name, last_name, user_name, password, confirmPassword } =
          data;
        if (!password || password !== confirmPassword) {
          throw new BadRequestException('Passwords do not match');
        }
        if (user_name) {
          const existingUsername =
            await this.authRepository.findUserByUsername(user_name);
          if (existingUsername) {
            throw new BadRequestException('Username already exists');
          }
        }
        pendingSignUp = {
          first_name: first_name!,
          last_name: last_name!,
          user_name,
          email,
          password: await bcrypt.hash(password, 10),
        };
      } else {
        // RESET_PASSWORD
        if (!existingUser) {
          throw new NotFoundException('Email not found');
        }
      }
      const otpData = this.otpStore.get(email);
      if (otpData) {
        const now = Date.now();
        const cooldown = parseInt(process.env.OTP_COOLDOWN || '60000');
        if (now - otpData.lastSentAt < cooldown) {
          throw new BadRequestException(
            'Please wait before requesting another OTP.',
          );
        }
      }
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      this.otpStore.set(email, {
        otpHash,
        expiresAt: Date.now() + parseInt(process.env.OTP_EXPIRES || '60000'),
        attempts: 0,
        lastSentAt: Date.now(),
        purpose,
        pendingSignUp,
      });
      await mailService.sendVerificationEmail(email, otp);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      console.error(error);
      throw new InternalServerException('Failed to send OTP');
    }
  }

  async veriFyOtp(
    data: VerifyOtpDto,
  ): Promise<{ user?: User; resetToken?: string }> {
    try {
      const otpData = this.otpStore.get(data.email);
      if (!otpData) {
        throw new BadRequestException('OTP is not found or expired');
      }
      if (otpData.purpose !== data.purpose) {
        throw new BadRequestException('OTP purpose mismatch');
      }
      const isOtpValid = await bcrypt.compare(data.otp, otpData.otpHash);
      if (!isOtpValid) {
        otpData.attempts++;
        if (otpData.attempts >= 5) {
          this.otpStore.delete(data.email);
          throw new BadRequestException('Too many attempts');
        }
        throw new BadRequestException(
          'OTP is incorrect remaining attempts: ' + (5 - otpData.attempts),
        );
      }
      if (otpData.expiresAt < Date.now()) {
        this.otpStore.delete(data.email);
        throw new BadRequestException('OTP is expired');
      }

      if (otpData.purpose === 'SIGN_UP') {
        if (!otpData.pendingSignUp) {
          throw new InternalServerException('No pending registration found');
        }
        const user = await this.authRepository.createUser({
          first_name: otpData.pendingSignUp.first_name,
          last_name: otpData.pendingSignUp.last_name,
          user_name: otpData.pendingSignUp.user_name,
          email: otpData.pendingSignUp.email,
          password: otpData.pendingSignUp.password,
          confirmPassword: otpData.pendingSignUp.password,
        });
        this.otpStore.delete(data.email);
        return { user };
      } else {
        const resetToken = crypto.randomBytes(32).toString('hex');
        otpData.attempts = 0;
        otpData.otpHash = ''; // vô hiệu OTP cũ, không cho verify lại
        // Lưu resetToken tạm để forgotPassword kiểm tra (có thể dùng Map khác)
        this.resetTokenStore.set(data.email, {
          token: resetToken,
          expiresAt: Date.now() + Number(Env.OTP_RESET_TOKEN), // 5 phút để đổi mật khẩu
        });
        this.otpStore.delete(data.email);
        return { resetToken };
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerException('Failed to verify OTP');
    }
  }

  async verifyRefreshToken(token: string): Promise<{ userId: string }> {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET || '') as {
        userId: string;
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
