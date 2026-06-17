import { PrismaClient, User } from "@prisma/client";
import { IUserRepository } from "../domain/user.repository";
import { UpdateProfileDto } from "../dto/user.dto";

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
}