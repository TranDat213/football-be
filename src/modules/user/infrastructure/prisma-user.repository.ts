import { OwnerRegistration, PrismaClient, User, UserRole } from "@prisma/client";
import { IUserRepository } from "../domain/user.repository";
import { AddOwnerDto, OwnerRegisterDto, UpdateProfileDto, UpdateRoleDto } from "../dto/user.dto";

export class PrismaUserRepository implements IUserRepository {
    constructor(
        private readonly prisma: PrismaClient
    ){}

    async getProfileById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async updateProfile(id: string, data: UpdateProfileDto,avatarUrl:string | null,avatarPublicId:string | null): Promise<User> {
        return this.prisma.user.update({
            where: { id },
            data:{
                ...data,
                avatarUrl:avatarUrl,
                avatarPublicId:avatarPublicId,
                updatedAt:new Date(),
            },
        });
    }

    async findProfileByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async findProfileByPhone(phone: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { phone },
        });
    }

    async findProfileByUsername(username: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { username },
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
}