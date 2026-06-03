import { IAuthRepository } from '../domain/auth.repository';
import { OAuthDto, SignUpDto } from '../dto/auth.dto';
import { PrismaClient, User } from '@prisma/client';

export class PrismaAuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async createUser(data: SignUpDto): Promise<User> {
    return await this.prisma.user.create({
      data: {
        firstName: data.first_name,
        lastName: data.last_name,
        username: data.user_name,
        email: data.email,
        role: data.role,
        phone: data.phone,
        password: data.password,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });
  }

  async findUserByUsername(username: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: {
        username: username,
      },
    });
  }

  async updatePassword(password: string, userId: string): Promise<User> {
    return await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password: password,
        updatedAt: new Date(),
      },
    });
  }
  async findUserByProvider(data: OAuthDto): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: {
        provider: data.provider,
        providerId: data.providerId,
      },
    });
  }
  async upsertOAuthUser(data: OAuthDto): Promise<User> {
    const usernamePrefix = data.email.split('@')[0];
    return await this.prisma.user.upsert({
      where: { email: data.email },
      update: {
        provider: data.provider,
        providerId: data.providerId,
        updatedAt: new Date(),
      },
      create: {
        email: data.email,
        firstName: usernamePrefix,
        lastName: 'User',
        username: `${usernamePrefix}_${Math.floor(Math.random() * 1000)}`,
        provider: data.provider,
        providerId: data.providerId,
      },
    });
  }
}
