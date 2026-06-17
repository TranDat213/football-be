import { User } from "@prisma/client";
import { IUserRepository } from "../domain/user.repository";
import { UpdateProfileDto } from "../dto/user.dto";
import { BadRequestException, NotFoundException } from "@/utils/app-error";
import { deleteImageFromCloudinary, FolderType, uploadToCloudinary } from "@/utils/cloudinary";
import 'multer';

export class UserService{
    constructor(
        private readonly userRepository: IUserRepository
    ){}
    
    async getProfileById(id: string): Promise<User | null> {
        const userProfile= await this.userRepository.getProfileById(id);
        if(!userProfile){
            throw new NotFoundException("User not found");
        }
        return userProfile;
    }

    async updateProfile(id: string, data: UpdateProfileDto,imageFile?: Express.Multer.File): Promise<User> {
        let avatarUrl: string | null = null;
        let avatarPublicId: string | null = null;
        let uploadedImage: any = null;
        const userProfile= await this.userRepository.getProfileById(id);
        if(!userProfile){
            throw new NotFoundException("User not found");
        }
        if(data.email){
            const existingUser = await this.userRepository.findProfileByEmail(data.email);
            if(existingUser && existingUser.id !== id){
                throw new BadRequestException("Email already exists");
            }
        }
        if(data.phone){
            const existingUser = await this.userRepository.findProfileByPhone(data.phone);
            if(existingUser && existingUser.id !== id){
                throw new BadRequestException("Phone already exists");
            }
        }
        if(imageFile){

            try{
           
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
              if(userProfile.avatarUrl){
                await deleteImageFromCloudinary(userProfile.avatarUrl);
            }
            }catch(error){
                if (uploadedImage?.publicId) {
                    await deleteImageFromCloudinary(uploadedImage.publicId);
                  }
                throw error;
            }
        }
        return await this.userRepository.updateProfile(id, data,avatarUrl!,avatarPublicId!);
    }
}