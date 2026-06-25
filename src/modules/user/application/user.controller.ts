import { NextFunction, Request, Response } from "express";
import { UserService } from "./user.service";
import 'multer';
import { AddOwnerDto, OwnerRegisterDto, UpdateRoleDto } from "../dto/user.dto";
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
    async getUserById(req:Request, res:Response, _next:NextFunction) {
        const id = req.params.id as string;
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

    async createOwner(req: Request, res: Response, _next: NextFunction) {
        const dto = req.body as AddOwnerDto;
        const user = await this.userService.createOwner(dto);
        return res.status(201).json({
          message: 'Create owner successfully',
          data: {
            user,
          },
        });
      }
    
      async updateRole(req: Request, res: Response, _next: NextFunction) {
        const dto = req.body as UpdateRoleDto;
        const user_id = req.params.id as string;
        const user = await this.userService.updateRole(dto, user_id);
        return res.status(200).json({
          message: 'Update role successfully',
          data: {
            user,
          },
        });
      }

      async createOwnerRegister(req: Request, res: Response, _next: NextFunction) {
          const dto = req.body as OwnerRegisterDto;
          const ownerRegistration = await this.userService.createOwnerRegister(dto);
          return res.status(201).json({
            message: 'Create owner registration successfully',
            data: {
              ownerRegistration,
            },
          });
        }
}