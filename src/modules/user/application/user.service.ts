import { OwnerRegistration, User, UserRole } from '@prisma/client';
import { IUserRepository } from '../domain/user.repository';
import {
  AddOwnerDto,
  OwnerRegisterDto,
  UpdateOwnerRegisterStatusDto,
  UpdateProfileDto,
  UpdateRoleDto,
  UpdateUserStatusDto,
} from '../dto/user.dto';
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
} from '@/utils/app-error';
import {
  deleteImageFromCloudinary,
  FolderType,
  uploadToCloudinary,
} from '@/utils/cloudinary';
import 'multer';
import bcrypt from 'bcryptjs';

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getProfileById(id: string): Promise<User | null> {
    const userProfile = await this.userRepository.getProfileById(id);
    if (!userProfile) {
      throw new NotFoundException('User not found');
    }
    return userProfile;
  }

  async updateProfile(
    id: string,
    data: UpdateProfileDto,
    imageFile?: Express.Multer.File,
  ): Promise<User> {
    let avatarUrl: string | null = null;
    let avatarPublicId: string | null = null;
    let uploadedImage: any = null;
    const userProfile = await this.userRepository.getProfileById(id);
    if (!userProfile) {
      throw new NotFoundException('User not found');
    }
    if (data.email) {
      const existingUser = await this.userRepository.findProfileByEmail(
        data.email,
      );
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Email already exists');
      }
    }
    if (data.phone) {
      const existingUser = await this.userRepository.findProfileByPhone(
        data.phone,
      );
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Phone already exists');
      }
    }
    if (imageFile) {
      try {
        uploadedImage = await uploadToCloudinary(
          imageFile.buffer,
          imageFile.originalname,
          FolderType.AVATARS,
        );
        if (!uploadedImage?.secureUrl || !uploadedImage?.publicId) {
          throw new BadRequestException('Failed to upload image');
        }
        avatarUrl = uploadedImage.secureUrl;
        avatarPublicId = uploadedImage.publicId;
        if (userProfile.avatarUrl) {
          await deleteImageFromCloudinary(userProfile.avatarUrl);
        }
      } catch (error) {
        if (uploadedImage?.publicId) {
          await deleteImageFromCloudinary(uploadedImage.publicId);
        }
        throw error;
      }
    }
    return await this.userRepository.updateProfile(
      id,
      data,
      avatarUrl!,
      avatarPublicId!,
    );
  }

  async createOwner(data: AddOwnerDto): Promise<User> {
    try {
      if (data.email) {
        const user = await this.userRepository.findProfileByEmail(data.email);
        if (user) {
          throw new BadRequestException('Email already exists');
        }
      }
      if (data.email) {
        const user = await this.userRepository.findProfileByUsername(
          data.email,
        );
        if (user) {
          throw new BadRequestException('Username already exists');
        }
      }
      if (data.phone) {
        const user = await this.userRepository.findProfileByPhone(data.phone);
        if (user) {
          throw new BadRequestException('Phone already exists');
        }
      }

      const hashedPassword = await bcrypt.hash(data.password || '12345678', 10);
      return await this.userRepository.createOwner({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
      });
    } catch (error) {
      console.error(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to create owner');
    }
  }

  async updateRole(data: UpdateRoleDto, user_id: string): Promise<User> {
    try {
      if (!user_id) {
        throw new BadRequestException('User ID is required');
      }
      const user = await this.userRepository.getProfileById(user_id);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return await this.userRepository.updateRole(data, user_id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to update role');
    }
  }

  async updateStatus(data: UpdateUserStatusDto, user_id: string): Promise<User> {
    try {
      if (!user_id) {
        throw new BadRequestException('User ID is required');
      }
      const user = await this.userRepository.getProfileById(user_id);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return await this.userRepository.updateStatus(data, user_id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to update status');
    }
  }

  //ownerregistration

  async createOwnerRegister(
    data: OwnerRegisterDto,
  ): Promise<OwnerRegistration> {
    try {
      // Validate email is provided
      if (!data.email) {
        throw new BadRequestException('Email is required');
      }

      // Check if email already exists
      const existingUser = await this.userRepository.findProfileByEmail(
        data.email,
      );
      if (data.user_id) {
        const user = await this.userRepository.getProfileById(data.user_id);
        if (!user) {
          throw new NotFoundException('User not found');
        }

        if (user.role === UserRole.OWNER) {
          throw new BadRequestException('You are already an owner.');
        }
      }
      return await this.userRepository.createOwnerRegister(data);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to register owner');
    }
  }

  async getOwnerRegisterPending(
    limit: number,
    page: number,
  ): Promise<OwnerRegistration[]> {
    try {
      return await this.userRepository.getOwnerRegisterPending(limit, page);
    } catch (error) {
      throw new InternalServerException('Failed to get owner register pending');
    }
  }

  async countOwnerRegisterPending(): Promise<number> {
    try {
      return await this.userRepository.countOwnerRegisterPending();
    } catch (error) {
      throw new InternalServerException('Failed to count owner register pending');
    }
  }

  async updateOwnerRegisterStatus(id: string, data: UpdateOwnerRegisterStatusDto): Promise<OwnerRegistration> {
    try {
      if (!id) {
        throw new BadRequestException('Owner register ID is required');
      }
      const ownerRegister = await this.userRepository.getOwnerRegisterById(id);
      if (!ownerRegister) {
        throw new NotFoundException('Owner register not found');
      }
      return await this.userRepository.updateOwnerRegisterStatus(id, data);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Failed to update owner register status');
    }
  }

  async getOwnerRegisterById(id: string): Promise<OwnerRegistration | null> {
    try {
      return await this.userRepository.getOwnerRegisterById(id);
    } catch (error) {
      throw new InternalServerException('Failed to get owner register by ID');
    }
  }

//get all users
  async getAllUsers(limit: number, page: number): Promise<User[]> {
    try {
      return await this.userRepository.getAllUsers(limit, page);
    } catch (error) {
      throw new InternalServerException('Failed to get all users');
    }
  }

  async getAllOwners(limit: number, page: number): Promise<User[]> {
    try {
      return await this.userRepository.getAllOwners(limit, page);
    } catch (error) {
      throw new InternalServerException('Failed to get all owners');
    }
  }

  async getAllAccounts(limit: number, page: number): Promise<User[]> {
    try {
      return await this.userRepository.getAllAccounts(limit, page);
    } catch (error) {
      throw new InternalServerException('Failed to get all accounts');
    }
  }

  async getAccountStatistics() {
    try {
      return await this.userRepository.getAccountStatistics();
    } catch (error) {
      throw new InternalServerException('Failed to get account statistics');
    }
  }
}
