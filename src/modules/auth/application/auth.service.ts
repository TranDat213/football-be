import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { IAuthRepository } from '../domain/auth.repository';
import { SignInDto, SignUpDto } from '../dto/auth.dto';
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
} from '@/utils/app-error';

export class AuthService {
  constructor(private readonly authRepository: IAuthRepository) {}

  async signUp(data: SignUpDto): Promise<User> {
    try {
        const {first_name,last_name,user_name,email,password,confirmPassword} = data
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

      const hashedPassword = await bcrypt.hash(data.password, 10);
      data.password === hashedPassword;
      return await this.authRepository.createUser({
        first_name,
        last_name,
        user_name,
        email,
        password:hashedPassword,
        confirmPassword,
      });
    } catch (error) {
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
        user = await this.authRepository.findUserByUsername(data.user_name);
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
      throw error;
    }
  }
}
