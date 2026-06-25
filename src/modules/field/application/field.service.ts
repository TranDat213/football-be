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

const SLOT_MINUTES = 90; // 1.5 giờ = 90 phút
const DEFAULT_OPEN_MIN = 6 * 60;   // 360
const DEFAULT_CLOSE_MIN = 22 * 60; // 1320
 
function toMinutes(value: Date | string): number {
  if (value instanceof Date) {
    return value.getUTCHours() * 60 + value.getUTCMinutes();
  }
  const [h, m] = String(value).split(':').map(Number);
  return h * 60 + (m || 0);
}
 
function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
 
/**
 * Tìm price rule phù hợp nhất cho slot [slotStart, slotEnd] (đơn vị: phút).
 *
 * Ưu tiên: specialDate > dayOfWeek cụ thể > dayOfWeek null (mọi ngày).
 * Điều kiện match: slot phải nằm HOÀN TOÀN trong khoảng của rule.
 */
function resolvePrice(
  priceRules: any[],
  slotStartMin: number,
  slotEndMin: number,
  dayOfWeek: number,
  date: Date,
): { price: number; label: string | null } {
  const dateStr = date.toISOString().slice(0, 10);
 
  const candidates = priceRules.filter((rule) => {
    const rStart = toMinutes(rule.startTime);
    const rEnd   = toMinutes(rule.endTime);
    return slotStartMin >= rStart && slotEndMin <= rEnd;
  });
 
  // 1. specialDate khớp ngày — ưu tiên cao nhất
  const specialRule = candidates.find(
    (r) => r.specialDate && r.specialDate.toISOString().slice(0, 10) === dateStr,
  );
  if (specialRule) return { price: Number(specialRule.price), label: specialRule.label ?? null };
 
  // 2. dayOfWeek cụ thể
  const dayRule = candidates.find(
    (r) => r.dayOfWeek === dayOfWeek && r.specialDate == null,
  );
  if (dayRule) return { price: Number(dayRule.price), label: dayRule.label ?? null };
 
  // 3. Áp dụng mọi ngày (dayOfWeek null)
  const fallbackRule = candidates.find(
    (r) => r.dayOfWeek == null && r.specialDate == null,
  );
  if (fallbackRule) return { price: Number(fallbackRule.price), label: fallbackRule.label ?? null };
 
  return { price: 0, label: null };
}
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
  const dayOfWeek = date.getUTCDay(); // 0=CN,1=T2,...,6=T7
 
  const yards = await this.fieldRepository.getAvailability(fieldId, date);
 
  const yardsWithSlots = yards.map((yard: any) => {
    // Giờ mở/đóng theo dayOfWeek, fallback về default
    const opHour     = yard.operatingHours.find((oh: any) => oh.dayOfWeek === dayOfWeek);
    const openMin    = opHour ? toMinutes(opHour.openTime)  : DEFAULT_OPEN_MIN;
    const closeMin   = opHour ? toMinutes(opHour.closeTime) : DEFAULT_CLOSE_MIN;
 
    // Booking ranges (phút)
    const bookedRanges: [number, number][] = yard.bookings.map((b: any) => [
      toMinutes(b.startTime),
      toMinutes(b.endTime),
    ]);
 
    const slots = [];
    for (let start = openMin; start + SLOT_MINUTES <= closeMin; start += SLOT_MINUTES) {
      const end = start + SLOT_MINUTES;
 
      const isBooked = bookedRanges.some(
        ([bStart, bEnd]) => start < bEnd && end > bStart,
      );
 
      const { price, label } = resolvePrice(
        yard.priceRules,
        start,
        end,
        dayOfWeek,
        date,
      );
 
      slots.push({
        startTime:  formatMinutes(start),
        endTime:    formatMinutes(end),
        status:     isBooked ? 'BOOKED' : 'AVAILABLE',
        price,
        priceLabel: label,
      });
    }
 
    return {
      yardId:   yard.id,
      yardName: yard.name,
      yardCode: yard.code,
      type:     yard.type,
      slots,
    };
  });
 
  return { date: dateStr, yards: yardsWithSlots };
}

  async findFieldActiveStatus(page:number,limit:number): Promise<FootballField[]> {
    return await this.fieldRepository.findFieldActiveStatus(page,limit);
  }
}
