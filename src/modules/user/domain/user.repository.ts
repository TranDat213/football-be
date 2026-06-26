import { OwnerRegistration, User } from '@prisma/client';
import {
  AddOwnerDto,
  OwnerRegisterDto,
  UpdateProfileDto,
  UpdateRoleDto,
} from '../dto/user.dto';

export interface IUserRepository {
  getProfileById(id: string): Promise<User | null>;
  updateProfile(
    id: string,
    data: UpdateProfileDto,
    avatarUrl: string | null,
    avatarPublicId: string | null,
  ): Promise<User>;
  findProfileByEmail(email: string): Promise<User | null>;
  findProfileByPhone(phone: string): Promise<User | null>;
  findProfileByUsername(username: string): Promise<User | null>;
  createOwner(data: AddOwnerDto): Promise<User>;
  updateRole(data: UpdateRoleDto, user_id: string): Promise<User>;
  getAllUsers(limit: number, page: number): Promise<User[]>;
  getAllOwners(limit: number, page: number): Promise<User[]>;
  getAllAccounts(limit: number, page: number): Promise<User[]>;
  getAccountStatistics(): Promise<{ totalAccounts: number; totalUsers: number; totalOwners: number }>;
  getOwnerRegisterPending(limit: number, page: number): Promise<OwnerRegistration[]>;

  countOwnerRegisterPending(): Promise<number>;

  createOwnerRegister(data: OwnerRegisterDto): Promise<OwnerRegistration>;
}
