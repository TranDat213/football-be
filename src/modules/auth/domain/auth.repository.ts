import { OAuthDto, OwnerRegisterDto, SignUpDto } from '../dto/auth.dto';
import { User,OwnerRegistration } from '@prisma/client';

export interface IAuthRepository {
  createUser(data: SignUpDto): Promise<User>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserByUsername(username: string): Promise<User | null>;
  updatePassword(password: string, userId: string): Promise<User>;
  findUserByProvider(data: OAuthDto): Promise<User | null>;
  upsertOAuthUser(data: OAuthDto): Promise<User>;
  createOwnerRegister(data: OwnerRegisterDto): Promise<OwnerRegistration>;
  findUserById(userId: string ): Promise<User | null>;
}
