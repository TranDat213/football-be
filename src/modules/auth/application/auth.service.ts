import { OwnerRegistration, User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { IAuthRepository } from '../domain/auth.repository';
import {
  AddOwnerDto,
  ForgotPasswordDto,
  OAuthDto,
  OwnerRegisterDto,
  SignInDto,
  SignUpDto,
  UpdateRoleDto,
} from '../dto/auth.dto';
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
  UnauthorizedException,
} from '@/utils/app-error';

export class AuthService {
  constructor(private readonly authRepository: IAuthRepository) {}

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
    try{
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

      const hashedPassword = await bcrypt.hash(data.password || "12345678", 10);
      return await this.authRepository.createOwner({
        first_name:data.first_name,
        last_name:data.last_name,
        email:data.email,
        phone:data.phone,
        password: hashedPassword,
      });
    }
    catch(error){
        console.error(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to create owner');
    }
   }

   async updateRole(data: UpdateRoleDto, user_id: string): Promise<User> {
    try{
      if(!user_id){
        throw new BadRequestException('User ID is required');
      }
      const user = await this.authRepository.findUserById(user_id);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return await this.authRepository.updateRole(data, user_id);
    }
    catch(error){
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to update role');
    }
   }
}
