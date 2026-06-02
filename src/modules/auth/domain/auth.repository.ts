import { SignUpDto } from "../dto/auth.dto";
import { User } from "@prisma/client";

export interface IAuthRepository {
    createUser(data: SignUpDto): Promise<User>;
    findUserByEmail(email: string): Promise<User | null>;
    findUserByUsername(username: string): Promise<User | null>;
}