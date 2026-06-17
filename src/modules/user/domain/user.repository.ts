import { User } from "@prisma/client";
import { UpdateProfileDto } from "../dto/user.dto";

export interface IUserRepository {
    getProfileById(id: string): Promise<User | null>;
    updateProfile(id: string, data: UpdateProfileDto,avatarUrl:string | null,avatarPublicId:string | null): Promise<User>;
    findProfileByEmail(email: string): Promise<User | null>;
    findProfileByPhone(phone: string): Promise<User | null>;
}