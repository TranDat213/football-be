import { NextFunction, Request, Response } from 'express';
import { UserService } from './user.service';
import 'multer';
import { AddOwnerDto, OwnerRegisterDto, UpdateRoleDto } from '../dto/user.dto';
export class UserController {
  constructor(private readonly userService: UserService) {}
  async getProfileById(req: Request, res: Response, _next: NextFunction) {
    const id = req.user?.id as string;
    const userProfile = await this.userService.getProfileById(id);
    return res.status(200).json({
      success: true,
      message: 'User profile fetched successfully',
      data: userProfile,
    });
  }
  async getUserById(req: Request, res: Response, _next: NextFunction) {
    const id = req.params.id as string;
    const userProfile = await this.userService.getProfileById(id);
    return res.status(200).json({
      success: true,
      message: 'User profile fetched successfully',
      data: userProfile,
    });
  }
  async updateProfile(req: Request, res: Response, _next: NextFunction) {
    const id = req.user?.id as string;
    const data = req.body;
    const imageFile = req.file as Express.Multer.File;
    const userProfile = await this.userService.updateProfile(
      id,
      data,
      imageFile,
    );
    return res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
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

  async getOwnerRegisterPending(req: Request, res: Response, _next: NextFunction) {
    const limit = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;
    const ownerRegistrations = await this.userService.getOwnerRegisterPending(limit, page);
    return res.status(200).json({
      message: 'Get owner register pending successfully',
      data: {
        ownerRegistrations,
      },
    });
  }

  async countOwnerRegisterPending(req: Request, res: Response, _next: NextFunction) {
    const count = await this.userService.countOwnerRegisterPending();
    return res.status(200).json({
      message: 'Count owner register pending successfully',
      data: {
        count,
      },
    });
  }

  async getAllUsers(req: Request, res: Response, _next: NextFunction) {
    const limit = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;
    const users = await this.userService.getAllUsers(limit, page);
    return res.status(200).json({
      message: 'Get all users successfully',
      data: {
        users,
      },
    });
  }

  async getAllOwners(req: Request, res: Response, _next: NextFunction) {
    const limit = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;
    const owners = await this.userService.getAllOwners(limit, page);
    return res.status(200).json({
      message: 'Get all owners successfully',
      data: {
        owners,
      },
    });
  }

  async getAllAccounts(req: Request, res: Response, _next: NextFunction) {
    const limit = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;
    const accounts = await this.userService.getAllAccounts(limit, page);
    return res.status(200).json({
      message: 'Get all accounts successfully',
      data: {
        accounts,
      },
    });
  }

  async getAccountStatistics(req: Request, res: Response, _next: NextFunction) {
    const statistics = await this.userService.getAccountStatistics();
    return res.status(200).json({
      message: 'Get account statistics successfully',
      data: {
        statistics,
      },
    });
  }
}
