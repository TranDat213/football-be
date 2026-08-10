import {
  FieldImage,
  FieldStatus,
  FootballField,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import {
  IFieldRepository,
  FieldActiveFilter,
  FieldPendingFilter,
  FieldOwnerFilter,
} from '../domain/field.repository';
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
import { formatMinutes, SLOT_MINUTES, toMinutes } from '@/config/time.config';

/**
 * Tìm price rule phù hợp nhất cho slot [slotStart, slotEnd] (đơn vị: phút).
 *
 */
export class FieldService {
  constructor(
    private readonly fieldRepository: IFieldRepository,
    private readonly prisma?: PrismaClient,
  ) {}

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
      throw new BadRequestException('Không tìm thấy sân bóng.');
    }
    return field;
  }

  async updateFieldStatus(
    fieldId: string,
    status: FieldStatus,
  ): Promise<FootballField> {
    const field = await this.fieldRepository.findById(fieldId);
    if (!field) throw new BadRequestException('Không tìm thấy sân bóng.');
    if (field.deletedAt) throw new BadRequestException('Sân bóng đã bị xóa.');

    let updatedField: FootballField;
    if (status === FieldStatus.INACTIVE) {
      updatedField = await this.fieldRepository.updateFieldStatusWithCascade(fieldId, status);
    } else {
      updatedField = await this.fieldRepository.updateFieldStatus(fieldId, status);
    }

    // Notify owner when field is approved (ACTIVE)
    if (status === FieldStatus.ACTIVE && this.prisma) {
      this.prisma.notification.create({
        data: {
          recipientId: field.ownerId,
          entityType: 'FootballField',
          entityId: fieldId,
          type: 'FIELD_APPROVED' as any,
          title: 'Sân bóng của bạn đã được phê duyệt.',
          content: `Sân ${field.name} đã được Admin phê duyệt và hiện đang hoạt động.`,
        },
      }).catch(() => {});
    }

    return updatedField;
  }

  async findByOwnerId(
    ownerId: string,
    filter: FieldOwnerFilter,
  ): Promise<{ data: FootballField[]; total: number }> {
    const user = await this.fieldRepository.findOwner(ownerId);
    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng.');
    }
    if (user.role !== UserRole.OWNER) {
      throw new BadRequestException('Người dùng không phải là chủ sân.');
    }
    return await this.fieldRepository.findByOwnerId(ownerId, filter);
  }

  async findFieldPendingStatus(
    filter: FieldPendingFilter,
  ): Promise<{ data: FootballField[]; total: number }> {
    return await this.fieldRepository.findFieldPendingStatus(filter);
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
      throw new BadRequestException('Tải ảnh lên thất bại.');
    }
    return { url: uploadedImage.secureUrl, publicId: uploadedImage.publicId };
  }

  async findFieldImageById(fieldImageId: string): Promise<FieldImage> {
    const fieldImage =
      await this.fieldRepository.findFieldImageById(fieldImageId);
    if (!fieldImage) {
      throw new BadRequestException('Không tìm thấy ảnh sân bóng.');
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
      throw new BadRequestException('Không tìm thấy sân bóng.');
    }
    if (field.deletedAt) {
      throw new BadRequestException('Sân bóng đã bị xóa.');
    }
    return await this.fieldRepository.findFieldImagesByFieldId(
      page,
      limit,
      fieldId,
    );
  }

  async getAvailability(fieldId: string, dateStr: string) {
    const field = await this.findById(fieldId);
    if (!field) {
      throw new BadRequestException('Sân không tồn tại');
    }
    if (field.status !== 'ACTIVE') {
      throw new BadRequestException('Sân không hoạt động');
    }
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay(); // 0=CN,1=T2,...,6=T7

    const yards = await this.fieldRepository.getAvailability(fieldId, date);



    const yardsWithSlots = yards.map((yard: any) => {
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

          const startFormatted = formatMinutes(start);
          const slotDateTime = new Date(`${dateStr}T${startFormatted}:00+07:00`);
          const isPast = slotDateTime < new Date(); // khóa slot đã qua thời gian thực

          // 1-1: Prisma trả object đơn "priceRule", không phải mảng "priceRules"
          const rule = timeSlot.priceRule;

          slots.push({
            startTime: startFormatted,
            endTime: formatMinutes(end),
            status: isBooked || isPast ? 'BOOKED' : 'AVAILABLE',
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
    filter: FieldActiveFilter,
  ): Promise<{ data: FootballField[]; total: number }> {
    return await this.fieldRepository.findFieldActiveStatus(filter);
  }
}
