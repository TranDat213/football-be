import { IAuthRepository } from '../domain/auth.repository';
import { AddOwnerDto, OAuthDto, OwnerRegisterDto, SignUpDto, UpdateRoleDto } from '../dto/auth.dto';
import { OwnerRegistration, PrismaClient, User, UserRole } from '@prisma/client';

export class PrismaAuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaClient) { }
  async createUser(data: SignUpDto): Promise<User> {
    return await this.prisma.user.create({
      data: {
        firstName: data.first_name,
        lastName: data.last_name,
        username: data.user_name,
        email: data.email,
        password: data.password,
        role: data.role || UserRole.USER,
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

  async createOwnerRegister(data: OwnerRegisterDto): Promise<OwnerRegistration> {
    return await this.prisma.ownerRegistration.create({
      data: {
        userId: data.user_id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        stadiumName: data.stadium_name,
        address: data.address,
      },
    });
  }

  async findUserById(userId: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async createOwner(data: AddOwnerDto): Promise<User> {
    return await this.prisma.user.create({
      data: {
        firstName: data.first_name,
        lastName: data.last_name,
        username: data.email,
        email: data.email,
        phone: data.phone,
        role: UserRole.OWNER,
        password: data.password || "12345678",
      }
    })
  }

  async updateRole(data: UpdateRoleDto, user_id: string): Promise<User> {
    return await this.prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        role: data.role,
        updatedAt: new Date(),
      },
    });
  }
}

