import { Prisma, PrismaClient } from '@prisma/client';
import { IFieldRepository } from '../domain/field.repository';
import { ISubFieldRepository } from '@/modules/sub_field/domain/subfield.repository';
import { IOperatingHourRepository } from '@/modules/operating_hour/domain/operating-hour.repository';
import { IPriceRuleRepository } from '@/modules/price_rule/domain/price-rule.repository';
import { FieldService } from './field.service';
import { UpdateFootballFieldCompleteDto } from '../dto/update-field-complete.dto';
import { BadRequestException } from '@/utils/app-error';
import { YARD_CODE_PREFIX } from '@/constants/yard.constant';
import { YardType } from '@prisma/client';
import { deleteImageFromCloudinary } from '@/utils/cloudinary';
import { CreateFootballFieldResult } from './create-football-field.usecase';

function toMinute(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export class UpdateFootballFieldUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly fieldRepository: IFieldRepository,
    private readonly subFieldRepository: ISubFieldRepository,
    private readonly operatingHourRepository: IOperatingHourRepository,
    private readonly priceRuleRepository: IPriceRuleRepository,
    private readonly fieldService: FieldService,
  ) {}

  async execute(
    ownerId: string,
    fieldId: string,
    dto: UpdateFootballFieldCompleteDto,
  ): Promise<CreateFootballFieldResult> {
    // ── Step 1: Pre-flight checks OUTSIDE the transaction ────────────────────

    const field = await this.fieldRepository.findById(fieldId);
    if (!field) throw new BadRequestException('Không tìm thấy sân bóng.');
    if (field.ownerId !== ownerId)
      throw new BadRequestException('Bạn không phải chủ sân này.');
    if (field.deletedAt)
      throw new BadRequestException('Sân bóng đã bị xóa.');

    if (dto.categoryId) {
      const category = await this.fieldRepository.findCategoryById(
        dto.categoryId,
      );
      if (!category) throw new BadRequestException('Không tìm thấy danh mục.');
    }

    // Slug — only regenerate if name changes
    let slug: string | undefined;
    if (dto.name && dto.name !== field.name) {
      slug = await this.fieldService.generateUniqueSlugExcluding(
        dto.name,
        fieldId,
      );
    }

    // Resolve open/close for slot validation (use dto values if provided, else fall back to DB)
    const openTime =
      dto.openTime ??
      (field.openTime
        ? `${String(field.openTime.getUTCHours()).padStart(2, '0')}:${String(field.openTime.getUTCMinutes()).padStart(2, '0')}`
        : undefined);
    const closeTime =
      dto.closeTime ??
      (field.closeTime
        ? `${String(field.closeTime.getUTCHours()).padStart(2, '0')}:${String(field.closeTime.getUTCMinutes()).padStart(2, '0')}`
        : undefined);

    if (dto.yards) {
      this.validateTimeSlots(dto, openTime, closeTime);
    }

    // ── Step 2: ONE atomic Prisma transaction ────────────────────────────────
    // Track newly-uploaded images present only in new payload (for rollback cleanup)
    const newIncomingPublicIds = new Set<string>(
      (dto.images ?? []).map((img) => img.publicId),
    );
    // Images to delete from Cloudinary AFTER commit (removed from DB, kept on cloud until commit)
    const publicIdsToDeleteAfterCommit: string[] = [];

    try {
      const result = await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // 2a. Update field scalar fields
          await this.fieldRepository.updateFieldTx(tx, fieldId, {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.description !== undefined && {
              description: dto.description ?? null,
            }),
            ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
            ...(dto.address !== undefined && { address: dto.address }),
            ...(dto.province !== undefined && { province: dto.province }),
            ...(dto.district !== undefined && { district: dto.district }),
            ...(dto.ward !== undefined && { ward: dto.ward ?? null }),
            ...(dto.latitude !== undefined && {
              latitude: dto.latitude ?? null,
            }),
            ...(dto.longitude !== undefined && {
              longitude: dto.longitude ?? null,
            }),
            ...(dto.openTime !== undefined && { openTime: dto.openTime }),
            ...(dto.closeTime !== undefined && { closeTime: dto.closeTime }),
            ...(slug !== undefined && { slug }),
          });

          // 2b. Images — compare by publicId
          if (dto.images !== undefined) {
            const existingImages = await this.fieldRepository.findFieldImagesTx(
              tx,
              fieldId,
            );
            const existingPublicIds = new Set(
              existingImages.map((img) => img.publicId ?? ''),
            );

            // Images to soft-delete in DB (not in new payload)
            const toDeleteIds: string[] = [];
            for (const img of existingImages) {
              if (!newIncomingPublicIds.has(img.publicId ?? '')) {
                toDeleteIds.push(img.id);
                if (img.publicId)
                  publicIdsToDeleteAfterCommit.push(img.publicId);
              }
            }
            await this.fieldRepository.deleteImagesTx(tx, toDeleteIds);

            // New images to insert
            const newImages = dto.images.filter(
              (img) => !existingPublicIds.has(img.publicId),
            );
            if (newImages.length > 0) {
              await this.fieldRepository.createFieldImagesTx(
                tx,
                fieldId,
                newImages,
              );
            }
          }

          // 2c. Yards — replace-all strategy per yard
          const yardResults: CreateFootballFieldResult['yards'] = [];

          if (dto.yards !== undefined) {
            const existingYards =
              await this.subFieldRepository.findYardsByFieldIdTx(tx, fieldId);
            const existingYardIds = new Set(existingYards.map((y) => y.id));
            const payloadYardIds = new Set(
              dto.yards.filter((y) => y.id).map((y) => y.id!),
            );

            // Yards in DB but not in payload → soft-delete
            for (const existingYard of existingYards) {
              if (!payloadYardIds.has(existingYard.id)) {
                // Booking validation before deleting
                // Architecture decision: refuse delete if active bookings exist on this yard
                const hasBookings =
                  await this.subFieldRepository.hasActiveBookingsTx(
                    tx,
                    existingYard.id,
                  );
                if (hasBookings) {
                  throw new BadRequestException(
                    `Không thể xóa sân con "${existingYard.name}" — sân đang có đơn đặt chờ (PENDING/CONFIRMED).`,
                  );
                }
                // Delete price rules → time slots → yard
                const slots =
                  await this.operatingHourRepository.findTimeSlotsTx(
                    tx,
                    existingYard.id,
                  );
                await this.priceRuleRepository.deletePriceRulesTx(
                  tx,
                  slots.map((s) => s.id),
                );
                await this.operatingHourRepository.deleteTimeSlotsTx(
                  tx,
                  existingYard.id,
                );
                await this.subFieldRepository.deleteYardTx(tx, existingYard.id);
              }
            }

            for (const yardDto of dto.yards) {
              let yard;

              if (yardDto.id && existingYardIds.has(yardDto.id)) {
                // ── Update existing yard: replace-all timeslots ─────────────
                // Booking validation before wiping slots
                const hasBookings =
                  await this.subFieldRepository.hasActiveBookingsTx(
                    tx,
                    yardDto.id,
                  );
                if (hasBookings) {
                  throw new BadRequestException(
                    `Không thể cập nhật khung giờ của sân con "${yardDto.name}" — sân đang có đơn đặt chờ (PENDING/CONFIRMED).`,
                  );
                }

                yard = await this.subFieldRepository.updateYardTx(
                  tx,
                  yardDto.id,
                  {
                    name: yardDto.name,
                    type: yardDto.type as YardType,
                  },
                );

                // Wipe then recreate slots + price rules
                const oldSlots =
                  await this.operatingHourRepository.findTimeSlotsTx(
                    tx,
                    yardDto.id,
                  );
                await this.priceRuleRepository.deletePriceRulesTx(
                  tx,
                  oldSlots.map((s) => s.id),
                );
                await this.operatingHourRepository.deleteTimeSlotsTx(
                  tx,
                  yardDto.id,
                );
              } else {
                // ── Create new yard ──────────────────────────────────────────
                const sibling =
                  await this.subFieldRepository.findSubfieldByTypeTx(
                    tx,
                    yardDto.type as YardType,
                    fieldId,
                  );
                const maxNumber = sibling.reduce((max, y) => {
                  const match = y.code.match(/\d+$/);
                  const num = match ? Number(match[0]) : 0;
                  return Math.max(max, num);
                }, 0);
                const prefix = YARD_CODE_PREFIX[yardDto.type as YardType];
                const code = `${prefix}_${maxNumber + 1}`;

                yard = await this.subFieldRepository.createSubfieldTx(
                  tx,
                  fieldId,
                  { name: yardDto.name, type: yardDto.type as YardType },
                  code,
                );
              }

              // Create timeslots + price rules
              const timeSlots =
                await this.operatingHourRepository.createManyOperatingHoursTx(
                  tx,
                  yard.id,
                  yardDto.timeSlots,
                );

              for (let i = 0; i < timeSlots.length; i++) {
                await this.priceRuleRepository.createPriceRuleTx(
                  tx,
                  timeSlots[i].id,
                  yardDto.timeSlots[i].priceRule,
                );
              }

              yardResults.push({
                yard,
                timeSlotCount: timeSlots.length,
                priceRuleCount: timeSlots.length,
              });
            }
          }

          // Re-fetch full updated field for return value
          const updatedField = (await this.fieldRepository.findById(fieldId))!;
          return {
            field: updatedField,
            imageCount: (updatedField as any).images?.length ?? 0,
            yards: yardResults,
          };
        },
        { timeout: 15000 },
      );

      // ── Post-commit: delete removed images from Cloudinary ──────────────
      if (publicIdsToDeleteAfterCommit.length > 0) {
        await Promise.allSettled(
          publicIdsToDeleteAfterCommit.map((pid) =>
            deleteImageFromCloudinary(pid),
          ),
        );
      }

      return result;
    } catch (error) {
      // Transaction rolled back → only cleanup NEW images that were in the request
      // (old images are safe — we only soft-delete them inside tx, Cloudinary delete happens post-commit)
      const newlyUploadedPublicIds = (dto.images ?? [])
        .filter((img) => img.publicId)
        .map((img) => img.publicId);

      if (newlyUploadedPublicIds.length > 0) {
        await Promise.allSettled(
          newlyUploadedPublicIds.map((pid) => deleteImageFromCloudinary(pid)),
        );
      }
      throw error;
    }
  }

  private validateTimeSlots(
    dto: UpdateFootballFieldCompleteDto,
    openTime?: string,
    closeTime?: string,
  ): void {
    if (!openTime || !closeTime || !dto.yards) return;

    const fieldOpen = toMinute(openTime);
    const fieldClose = toMinute(closeTime);

    dto.yards.forEach((yard, yardIndex) => {
      const byDay = new Map<
        number,
        Array<{ start: number; end: number; index: number }>
      >();

      yard.timeSlots.forEach((slot, slotIndex) => {
        const start = toMinute(slot.startTime);
        const end = toMinute(slot.endTime);

        if (start >= end) {
          throw new BadRequestException(
            `yards.${yardIndex}.timeSlots.${slotIndex}.endTime phải sau startTime`,
          );
        }
        if (start < fieldOpen || end > fieldClose) {
          throw new BadRequestException(
            `yards.${yardIndex}.timeSlots.${slotIndex} phải nằm trong khoảng openTime/closeTime của sân`,
          );
        }

        const slots = byDay.get(slot.dayOfWeek) ?? [];
        const overlap = slots.find(
          (item) => item.start < end && item.end > start,
        );
        if (overlap) {
          throw new BadRequestException(
            `yards.${yardIndex}.timeSlots.${slotIndex} bị trùng khớp với timeSlots.${overlap.index}`,
          );
        }
        slots.push({ start, end, index: slotIndex });
        byDay.set(slot.dayOfWeek, slots);
      });
    });
  }
}
