import { OwnerRegistration, User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { IAuthRepository, OtpData } from '../domain/auth.repository';
import {
  AddOwnerDto,
  ForgotPasswordDto,
  OAuthDto,
  OwnerRegisterDto,
  SignInDto,
  SignUpDto,
  UpdateRoleDto,
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

export class AuthService {
  constructor(private readonly authRepository: IAuthRepository) {}

  private otpStore = new Map<string, OtpData>();
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
      throw new InternalServerException('Failed to forgot password');
    }
  }

  async createOwnerRegister(
    data: OwnerRegisterDto,
  ): Promise<OwnerRegistration> {
    try {
      // Validate email is provided
      if (!data.email) {
        throw new BadRequestException('Email is required');
      }

      // Check if email already exists
      const existingUser = await this.authRepository.findUserByEmail(
        data.email,
      );
      if (data.user_id) {
        const user = await this.authRepository.findUserById(data.user_id);
        if (!user) {
          throw new NotFoundException('User not found');
        }

        if (user.role === UserRole.OWNER) {
          throw new BadRequestException('You are already an owner.');
        }
      }
      return await this.authRepository.createOwnerRegister(data);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to register owner');
    }
  }

  async createOwner(data: AddOwnerDto): Promise<User> {
    try {
      if (data.email) {
        const user = await this.authRepository.findUserByEmail(data.email);
        if (user) {
          throw new BadRequestException('Email already exists');
        }
      }
      if (data.email) {
        const user = await this.authRepository.findUserByUsername(data.email);
        if (user) {
          throw new BadRequestException('Username already exists');
        }
      }
      if (data.phone) {
        const user = await this.authRepository.findUserByPhone(data.phone);
        if (user) {
          throw new BadRequestException('Phone already exists');
        }
      }

      const hashedPassword = await bcrypt.hash(data.password || '12345678', 10);
      return await this.authRepository.createOwner({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
      });
    } catch (error) {
      console.error(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to create owner');
    }
  }

  async updateRole(data: UpdateRoleDto, user_id: string): Promise<User> {
    try {
      if (!user_id) {
        throw new BadRequestException('User ID is required');
      }
      const user = await this.authRepository.findUserById(user_id);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return await this.authRepository.updateRole(data, user_id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to update role');
    }
  }
  async requestOtp(email: string): Promise<void> {
    try {
      const user = await this.authRepository.findUserByEmail(email);

      console.log('2. user:', user?.email);
      if (!user) {
        throw new NotFoundException('Email not found');
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
      });
      await mailService.sendVerificationEmail(email, otp);
      console.log('4. mail sent');
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error(error);
      throw new InternalServerException('Failed to send OTP');
    }
  }

  async veriFyOtp(data: VerifyOtpDto): Promise<void> {
    try {
      const user = await this.authRepository.findUserByEmail(data.email);
      if (!user) {
        throw new NotFoundException('Email not found');
      }
      const otpData = this.otpStore.get(data.email);
      if (!otpData) {
        throw new BadRequestException('OTP is not found');
      }
      const isOtpValid = await bcrypt.compare(data.otp, otpData.otpHash);
      if (!isOtpValid) {
        otpData.attempts++;
        if (otpData.attempts >= 5) {
          this.otpStore.delete(data.email);
          throw new BadRequestException('Too many attempts');
        }
        throw new BadRequestException('OTP is incorrect remaining attempts: ' + (5 - otpData.attempts));
      }
      if (otpData.expiresAt < Date.now()) {
        this.otpStore.delete(data.email);
        throw new BadRequestException('OTP is expired');
      }
      this.otpStore.delete(data.email);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to verify OTP');
    }
  }
}
