import { IAuthRepository } from "../domain/auth.repository";
import { SignUpDto } from "../dto/auth.dto";
import { PrismaClient, User } from "@prisma/client";

export class PrismaAuthRepository implements IAuthRepository {
    constructor(private readonly prisma:PrismaClient){}
    async createUser(data: SignUpDto): Promise<User> {
        return await this.prisma.user.create({
            data:{
                firstName: data.first_name,
                lastName: data.last_name,
                username: data.user_name,
                email: data.email,
                password: data.password,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        })
    }

    async findUserByEmail(email: string): Promise<User | null> {
        return await this.prisma.user.findUnique({
            where:{
                email: email,
            }
        })
    }

    async findUserByUsername(username: string): Promise<User | null> {
        return await this.prisma.user.findUnique({
            where:{
                username: username,
            }
        })
    }
    
}