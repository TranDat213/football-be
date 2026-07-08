import {
  FieldImage,
  FieldStatus,
  FootballField,
  UserRole,
} from '@prisma/client';
import { IFieldRepository } from '../domain/field.repository';
import { UpdateFieldDto, UpdateFieldImageDto } from '../dto/field.dto';
import { appendSlugSuffix, normalizeSlug } from '@/utils/slug';
import { Env } from '@/config/env.config';
import { BadRequestException } from '@/utils/app-error';
import {
  deleteImageFromCloudinary,
  FolderType,
  uploadToCloudinary,
} from '@/utils/cloudinary';
import 'multer';

const SLOT_MINUTES = 90; // 1.5 giờ = 90 phút

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
 */
export class FieldService {
  constructor(private readonly fieldRepository: IFieldRepository) {}

  async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = normalizeSlug(name);

    if (!baseSlug) {
      throw new BadRequestException('Tên không hợp lệ');
    }

    let slug = baseSlug;
    let counter = 1;

    while (await this.fieldRepository.findBySlug(slug)) {
      slug = appendSlugSuffix(baseSlug, counter);
      counter++;
    }

    return slug;
  }

  /**
   * Like generateUniqueSlug but skips the slug that currently belongs to fieldId,
   * so renaming a field to the same name doesn't collide with itself.
   */
  async generateUniqueSlugExcluding(
    name: string,
    fieldId: string,
  ): Promise<string> {
    const baseSlug = normalizeSlug(name);
    if (!baseSlug) throw new BadRequestException('Tên không hợp lệ');

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.fieldRepository.findBySlug(slug);
      if (!existing || existing.id === fieldId) break;
      slug = appendSlugSuffix(baseSlug, counter);
      counter++;
    }

    return slug;
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
    if (!field) throw new BadRequestException('Field not found');
    if (field.deletedAt) throw new BadRequestException('Field is deleted');

    if (status === FieldStatus.INACTIVE) {
      return await this.fieldRepository.updateFieldStatusWithCascade(
        fieldId,
        status,
      );
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

  async findFieldPendingStatus(
    page: number,
    limit: number,
  ): Promise<FootballField[]> {
    return await this.fieldRepository.findFieldPendingStatus(page, limit);
  }

  async getFieldStatics(): Promise<any> {
    return await this.fieldRepository.getFieldStatics();
  }

  // Field Images

  async uploadImage(
    imageFile: Express.Multer.File,
  ): Promise<{ url: string; publicId: string }> {
    const uploadedImage = await uploadToCloudinary(
      imageFile.buffer,
      imageFile.originalname,
      FolderType.IMAGES,
    );
    if (!uploadedImage?.secureUrl || !uploadedImage?.publicId) {
      throw new BadRequestException('Failed to upload image');
    }
    return { url: uploadedImage.secureUrl, publicId: uploadedImage.publicId };
  }

  async findFieldImageById(fieldImageId: string): Promise<FieldImage> {
    const fieldImage =
      await this.fieldRepository.findFieldImageById(fieldImageId);
    if (!fieldImage) {
      throw new BadRequestException('Field image not found');
    }
    return fieldImage;
  }

  async findFieldImagesByFieldId(
    page: number,
    limit: number,
    fieldId: string,
  ): Promise<FieldImage[]> {
    const field = await this.fieldRepository.findById(fieldId);
    if (!field) {
      throw new BadRequestException('Field not found');
    }
    if (field.deletedAt) {
      throw new BadRequestException('Field is deleted');
    }
    return await this.fieldRepository.findFieldImagesByFieldId(
      page,
      limit,
      fieldId,
    );
  }

  async getAvailability(fieldId: string, dateStr: string) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay(); // 0=CN,1=T2,...,6=T7

    const yards = await this.fieldRepository.getAvailability(fieldId, date);

    const yardsWithSlots = yards.map((yard: any) => {
      // Booking ranges (phút)
      const bookedRanges: [number, number][] = yard.bookings.map((b: any) => [
        toMinutes(b.startTime),
        toMinutes(b.endTime),
      ]);

      const slots = [];
      const timeSlots = yard.timeSlots.filter(
        (slot: any) => slot.dayOfWeek === dayOfWeek,
      );
      for (const timeSlot of timeSlots) {
        const openMin = toMinutes(timeSlot.startTime);
        const closeMin = toMinutes(timeSlot.endTime);

        for (
          let start = openMin;
          start + SLOT_MINUTES <= closeMin;
          start += SLOT_MINUTES
        ) {
          const end = start + SLOT_MINUTES;
          const isBooked = bookedRanges.some(
            ([bStart, bEnd]) => start < bEnd && end > bStart,
          );
          const rule = timeSlot.priceRules[0];

          slots.push({
            startTime: formatMinutes(start),
            endTime: formatMinutes(end),
            status: isBooked ? 'BOOKED' : 'AVAILABLE',
            price: rule ? Number(rule.price) : 0,
            priceLabel: timeSlot.label ?? null,
          });
        }
      }

      return {
        yardId: yard.id,
        yardName: yard.name,
        yardCode: yard.code,
        type: yard.type,
        slots,
      };
    });

    return { date: dateStr, yards: yardsWithSlots };
  }

  async findFieldActiveStatus(
    page: number,
    limit: number,
  ): Promise<FootballField[]> {
    return await this.fieldRepository.findFieldActiveStatus(page, limit);
  }
}
