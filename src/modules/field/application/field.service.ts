import {
  FieldImage,
  FieldStatus,
  FootballField,
  UserRole,
} from '@prisma/client';
import { IFieldRepository } from '../domain/field.repository';
import {
  CreateFieldImageDto,
  FieldDto,
  UpdateFieldDto,
  UpdateFieldImageDto,
} from '../dto/field.dto';
import { normalizeSlug } from '@/utils/slug';
import { Env } from '@/config/env.config';
import { BadRequestException } from '@/utils/app-error';
import { deleteImageFromCloudinary, FolderType, uploadToCloudinary } from '@/utils/cloudinary';
import 'multer';

export class FieldService {
  constructor(private readonly fieldRepository: IFieldRepository) {}

  async createField(ownerId: string, data: FieldDto): Promise<FootballField> {
    const slug = normalizeSlug(data.name, Env.MAX_SLUG_LENGTH);
    if (!slug) {
      throw new BadRequestException('Field name is invalid to generate slug');
    }
    const owner = await this.fieldRepository.findOwner(ownerId);
    if (!owner || owner.role !== UserRole.OWNER) {
      throw new BadRequestException('Owner not found');
    }
    const category = await this.fieldRepository.findCategoryById(
      data.category_id,
    );
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    return await this.fieldRepository.createField(ownerId, data, slug);
  }

  async updateField(
    fieldId: string,
    data: UpdateFieldDto,
  ): Promise<FootballField> {
    let slug: string | undefined = undefined;
    if (data.name) {
      slug = normalizeSlug(data.name, Env.MAX_SLUG_LENGTH);
      if (!slug) {
        throw new BadRequestException('Field name is invalid to generate slug');
      }
    }
    const field = await this.fieldRepository.findById(fieldId);
    if (!field) {
      throw new BadRequestException('Field not found');
    }
    if (data.category_id) {
      const category = await this.fieldRepository.findCategoryById(
        data.category_id,
      );
      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }
    return await this.fieldRepository.updateField(fieldId, data, slug);
  }

  async deleteField(fieldId: string): Promise<FootballField> {
    const field = await this.fieldRepository.findById(fieldId);
    if (!field) {
      throw new BadRequestException('Field not found');
    }
    if (field?.status === FieldStatus.ACTIVE) {
      throw new BadRequestException('Field is active');
    }
    return await this.fieldRepository.deleteField(fieldId);
  }

  async findById(fieldId: string): Promise<FootballField> {
    const field = await this.fieldRepository.findById(fieldId);
    if (!field) {
      throw new BadRequestException('Field not found');
    }
    return field;
  }

  async updateFieldStatus(
    fieldId: string,
    status: FieldStatus,
  ): Promise<FootballField> {
    const field = await this.fieldRepository.findById(fieldId);
    if (!field) {
      throw new BadRequestException('Field not found');
    }
    if (field.deletedAt) {
      throw new BadRequestException('Field is deleted');
    }
    return await this.fieldRepository.updateFieldStatus(fieldId, status);
  }

  async findByOwnerId(
    page: number,
    limit: number,
    ownerId: string,
  ): Promise<FootballField[]> {
    const user = await this.fieldRepository.findOwner(ownerId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.role !== UserRole.OWNER) {
      throw new BadRequestException('User is not owner');
    }
    return await this.fieldRepository.findByOwnerId(page, limit, ownerId);
  }

  // Field Images
  async createFieldImage(
    data: CreateFieldImageDto,
    ownerId: string,
    imageFile?: Express.Multer.File,
  ): Promise<FieldImage> {
     let imageUrl: string | null = null;
    let imagePublicId: string | null = null;
    let uploadedImage: any = null;
    try{
    const field = await this.fieldRepository.findById(data.footballFieldId);
    if (!field) {
      throw new BadRequestException('Field not found');
    }
    if (field.deletedAt) {
      throw new BadRequestException('Field is deleted');
    }
    const fieldOwner = await this.fieldRepository.findFieldByOwnerId(ownerId);
    if (!fieldOwner || ownerId !== field.ownerId ) {
      throw new BadRequestException('You are not owner of this field');
    }
    if (imageFile) {
      uploadedImage = await uploadToCloudinary(
        imageFile.buffer,
        imageFile.originalname,
        FolderType.IMAGES,
      );
      if (!uploadedImage?.secureUrl || !uploadedImage?.publicId) {
        throw new BadRequestException('Failed to upload image');
      }
      imageUrl = uploadedImage.secureUrl;
      imagePublicId = uploadedImage.publicId;
    }
    return await this.fieldRepository.createFieldImage(data,imageUrl!,imagePublicId!);
  }catch(error){
    if (uploadedImage?.publicId) {
        await deleteImageFromCloudinary(uploadedImage.publicId);
      }
    throw error;
  }
  }

  async updateFieldImage(
    fieldImageId: string,
    data: UpdateFieldImageDto,
    imageFile?: Express.Multer.File,
  ): Promise<FieldImage> {
    let uploadedImage: any = null;
    try{
    const fieldImage =
      await this.fieldRepository.findFieldImageById(fieldImageId);
      let imageUrl: string;
      let imagePublicId: string;
    if (!fieldImage) {
      throw new BadRequestException('Field image not found');
    }
    if (fieldImage.deletedAt) {
      throw new BadRequestException('Field image is deleted');
    }
    const oldpublicId = fieldImage.publicId;
    if (imageFile) {
      uploadedImage = await uploadToCloudinary(
        imageFile.buffer,
        imageFile.originalname,
        FolderType.IMAGES,
      );
      if (!uploadedImage?.secureUrl || !uploadedImage?.publicId) {
        throw new BadRequestException('Failed to upload image');
      }
      imageUrl = uploadedImage.secureUrl;
      imagePublicId = uploadedImage.publicId;
    }

    if(imageFile && oldpublicId){
      await deleteImageFromCloudinary(oldpublicId);
    }
    return await this.fieldRepository.updateFieldImage(fieldImageId, data,imageUrl!,imagePublicId!);
  }catch(error){
    if (uploadedImage?.publicId) {
        await deleteImageFromCloudinary(uploadedImage.publicId);
      }
    throw error;
  }
  }

  async deleteFieldImage(fieldImageId: string): Promise<FieldImage> {
    const fieldImage =
      await this.fieldRepository.findFieldImageById(fieldImageId);
    if (!fieldImage) {
      throw new BadRequestException('Field image not found');
    }
    if (fieldImage.deletedAt) {
      throw new BadRequestException('Field image is deleted');
    }
    return await this.fieldRepository.deleteFieldImage(fieldImageId);
  }

  async findFieldImageById(fieldImageId: string): Promise<FieldImage> {
    const fieldImage =
      await this.fieldRepository.findFieldImageById(fieldImageId);
    if (!fieldImage) {
      throw new BadRequestException('Field image not found');
    }
    return fieldImage;
  }

  async findFieldImagesByFieldId(page:number,limit:number,fieldId: string): Promise<FieldImage[]> {
    const field = await this.fieldRepository.findById(fieldId);
    if (!field) {
      throw new BadRequestException('Field not found');
    }
    if (field.deletedAt) {
      throw new BadRequestException('Field is deleted');
    }
    return await this.fieldRepository.findFieldImagesByFieldId(page,limit,fieldId);
  }

  async getAvailability(fieldId: string, dateStr: string) {
    const date = new Date(dateStr);
    const yards = await this.fieldRepository.getAvailability(fieldId, date);
    
    // Generate slots for each yard (simplified for now: 6:00 to 22:00, 1.5h per slot)
    // In a real app, this should come from operating hours.
    const slots = [];
    const startTime = 6;
    const endTime = 22;
    const slotDuration = 1.5;

    for (let h = startTime; h < endTime; h += slotDuration) {
      const h_start = Math.floor(h);
      const m_start = (h % 1) * 60;
      const h_end = Math.floor(h + slotDuration);
      const m_end = ((h + slotDuration) % 1) * 60;

      const formatTime = (hh: number, mm: number) => `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
      const startStr = formatTime(h_start, m_start);
      const endStr = formatTime(h_end, m_end);

      // Check if ANY yard is available for this slot
      const isBooked = yards.some((yard: any) => 
        yard.bookings.some((b: any) => {
          const b_start = b.startTime.getUTCHours() + b.startTime.getUTCMinutes() / 60;
          const b_end = b.endTime.getUTCHours() + b.endTime.getUTCMinutes() / 60;
          return (h < b_end && (h + slotDuration) > b_start);
        })
      );

      slots.push({
        startTime: startStr,
        endTime: endStr,
        status: isBooked ? 'BOOKED' : 'AVAILABLE'
      });
    }

    return {
      date: dateStr,
      slots: slots
    };
  }
}
