import { OwnerRegistration, OwnerRegistrationStatus, PrismaClient, User, UserRole } from '@prisma/client';
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
import { notifyAllAdmins } from '@/modules/notification/application/notification.service';

export class UserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly prisma?: PrismaClient,
  ) {}

  async getProfileById(id: string): Promise<User | null> {
    const userProfile = await this.userRepository.getProfileById(id);
    if (!userProfile) {
      throw new NotFoundException('Không tìm thấy người dùng.');
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
      throw new NotFoundException('Không tìm thấy người dùng.');
    }
    if (data.email) {
      const existingUser = await this.userRepository.findProfileByEmail(
        data.email,
      );
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Email đã tồn tại.');
      }
    }
    if (data.phone) {
      const existingUser = await this.userRepository.findProfileByPhone(
        data.phone,
      );
      if (existingUser && existingUser.id !== id) {
        throw new BadRequestException('Số điện thoại đã tồn tại.');
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
          throw new BadRequestException('Tải ảnh lên thất bại.');
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
          throw new BadRequestException('Email đã tồn tại.');
        }
      }
      if (data.email) {
        const user = await this.userRepository.findProfileByUsername(
          data.email,
        );
        if (user) {
          throw new BadRequestException('Tên đăng nhập đã tồn tại.');
        }
      }
      if (data.phone) {
        const user = await this.userRepository.findProfileByPhone(data.phone);
        if (user) {
          throw new BadRequestException('Số điện thoại đã tồn tại.');
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
      throw new InternalServerException('Tạo tài khoản chủ sân thất bại.');
    }
  }

  async updateRole(data: UpdateRoleDto, user_id: string): Promise<User> {
    try {
      if (!user_id) {
        throw new BadRequestException('Thiếu ID người dùng.');
      }
      const user = await this.userRepository.getProfileById(user_id);
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng.');
      }
      return await this.userRepository.updateRole(data, user_id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Cập nhật quyền thất bại.');
    }
  }

  async updateStatus(data: UpdateUserStatusDto, user_id: string): Promise<User> {
    try {
      if (!user_id) {
        throw new BadRequestException('Thiếu ID người dùng.');
      }
      const user = await this.userRepository.getProfileById(user_id);
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng.');
      }
      return await this.userRepository.updateStatus(data, user_id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Cập nhật trạng thái thất bại.');
    }
  }

  //ownerregistration

  async createOwnerRegister(
    data: OwnerRegisterDto,
  ): Promise<OwnerRegistration> {
    try {
      // Validate email is provided
      if (!data.email) {
        throw new BadRequestException('Vui lòng cung cấp email.');
      }

      // Check if email already exists
      const existingUser = await this.userRepository.findProfileByEmail(
        data.email,
      );
      if (data.user_id) {
        const user = await this.userRepository.getProfileById(data.user_id);
        if (!user) {
          throw new NotFoundException('Không tìm thấy người dùng.');
        }

        if (user.role === UserRole.OWNER) {
          throw new BadRequestException('Bạn đã là chủ sân rồi.');
        }
      }
      const registration = await this.userRepository.createOwnerRegister(data);

      // Notify all admins about new owner registration request
      if (this.prisma) {
        notifyAllAdmins(this.prisma, {
          entityType: 'OwnerRegistration',
          entityId: registration.id,
          type: 'OWNER_REGISTER_WAITING',
          title: 'Có phiếu đăng ký chủ sân cần phê duyệt.',
          content: `${data.first_name} ${data.last_name} đã gửi yêu cầu đăng ký chủ sân.`,
        }).catch(() => {});
      }

      return registration;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Đăng ký chủ sân thất bại.');
    }
  }

  async getOwnerRegisterPending(
    limit: number,
    page: number,
  ): Promise<OwnerRegistration[]> {
    try {
      return await this.userRepository.getOwnerRegisterPending(limit, page);
    } catch (error) {
      throw new InternalServerException('Lấy danh sách đăng ký chủ sân đang chờ thất bại.');
    }
  }

  async countOwnerRegisterPending(): Promise<number> {
    try {
      return await this.userRepository.countOwnerRegisterPending();
    } catch (error) {
      throw new InternalServerException('Đếm số đăng ký chủ sân đang chờ thất bại.');
    }
  }

  async updateOwnerRegisterStatus(id: string, data: UpdateOwnerRegisterStatusDto): Promise<OwnerRegistration> {
    try {
      if (!id) {
        throw new BadRequestException('Thiếu ID phiếu đăng ký chủ sân.');
      }
      const ownerRegister = await this.userRepository.getOwnerRegisterById(id);
      if (!ownerRegister) {
        throw new NotFoundException('Không tìm thấy phiếu đăng ký chủ sân.');
      }
      const result = await this.userRepository.updateOwnerRegisterStatus(id, data);

      // Notify user when approved
      if (
        this.prisma &&
        data.status === OwnerRegistrationStatus.APPROVED &&
        ownerRegister.userId
      ) {
        this.prisma.notification.create({
          data: {
            recipientId: ownerRegister.userId,
            entityType: 'OwnerRegistration',
            entityId: id,
            type: 'OWNER_REGISTER_APPROVED' as any,
            title: 'Đăng ký chủ sân được phê duyệt',
            content: 'Tài khoản của bạn đã được cấp quyền chủ sân.',
          },
        }).catch(() => {});
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Cập nhật trạng thái phiếu đăng ký chủ sân thất bại.');
    }
  }

  async getOwnerRegisterById(id: string): Promise<OwnerRegistration | null> {
    try {
      return await this.userRepository.getOwnerRegisterById(id);
    } catch (error) {
      throw new InternalServerException('Lấy phiếu đăng ký chủ sân thất bại.');
    }
  }

//get all users
  async getAllUsers(limit: number, page: number, filter?: any): Promise<{ data: User[]; total: number }> {
    try {
      return await this.userRepository.getAllUsers(limit, page, filter);
    } catch (error) {
      throw new InternalServerException('Lấy danh sách người dùng thất bại.');
    }
  }

  async getAllOwners(limit: number, page: number, filter?: any): Promise<{ data: User[]; total: number }> {
    try {
      return await this.userRepository.getAllOwners(limit, page, filter);
    } catch (error) {
      throw new InternalServerException('Lấy danh sách chủ sân thất bại.');
    }
  }

  async getAllAccounts(limit: number, page: number, filter?: any): Promise<{ data: User[]; total: number }> {
    try {
      return await this.userRepository.getAllAccounts(limit, page, filter);
    } catch (error) {
      throw new InternalServerException('Lấy danh sách tài khoản thất bại.');
    }
  }

  async getAccountStatistics() {
    try {
      return await this.userRepository.getAccountStatistics();
    } catch (error) {
      throw new InternalServerException('Lấy thống kê tài khoản thất bại.');
    }
  }
}
