import { NextFunction, Request, Response } from "express";
import { UserService } from "./user.service";
import 'multer';
export class UserController{
    constructor(private readonly userService:UserService){}
    async getProfileById(req:Request, res:Response, _next:NextFunction) {
        const id = req.user?.id as string;
        const userProfile = await this.userService.getProfileById(id);
        return res.status(200).json({
            success: true,
            message: "User profile fetched successfully",
            data: userProfile,
        });
    }
    async updateProfile(req:Request, res:Response, _next:NextFunction) {
        const id = req.user?.id as string;
        const data = req.body;
        const imageFile = req.file as Express.Multer.File;
        const userProfile = await this.userService.updateProfile(id, data,imageFile);
        return res.status(200).json({
            success: true,
            message: "User profile updated successfully",
            data: userProfile,
        });
    }
}