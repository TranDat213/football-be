import {
  AddOwnerDto,
  OAuthDto,
  OwnerRegisterDto,
  SignUpDto,
  UpdateRoleDto,
} from '../dto/auth.dto';
import { User, OwnerRegistration, UserRole } from '@prisma/client';

export interface OtpData {
    otpHash: string;
    expiresAt: number;
    attempts: number;
    lastSentAt: number;
}
export interface IAuthRepository {
  createUser(data: SignUpDto): Promise<User>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserByUsername(username: string): Promise<User | null>;
  updatePassword(password: string, userId: string): Promise<User>;
  findUserByProvider(data: OAuthDto): Promise<User | null>;
  upsertOAuthUser(data: OAuthDto): Promise<User>;
  createOwnerRegister(data: OwnerRegisterDto): Promise<OwnerRegistration>;
  findUserById(userId: string): Promise<User | null>;
  findUserByPhone(phone: string): Promise<User | null>;
  createOwner(data: AddOwnerDto): Promise<User>;
  updateRole(data: UpdateRoleDto, user_id: string): Promise<User>;
}
