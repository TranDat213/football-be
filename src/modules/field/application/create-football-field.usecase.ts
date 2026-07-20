import { Prisma, PrismaClient } from '@prisma/client';
import { IFieldRepository } from '../domain/field.repository';
import { ISubFieldRepository } from '@/modules/sub_field/domain/subfield.repository';
import { IOperatingHourRepository } from '@/modules/operating_hour/domain/operating-hour.repository';
import { IPriceRuleRepository } from '@/modules/price_rule/domain/price-rule.repository';
import { FieldService } from './field.service';
import { CreateFootballFieldCompleteDto } from '../dto/create-field-complete.dto';
import { BadRequestException } from '@/utils/app-error';
import { YARD_CODE_PREFIX } from '@/constants/yard.constant';
import { YardType } from '@prisma/client';
import { deleteImageFromCloudinary } from '@/utils/cloudinary';
import { notifyAllAdmins } from '@/modules/notification/application/notification.service';

export interface CreateFootballFieldResult {
  field: any;
  imageCount: number;
  yards: Array<{
    yard: any;
    timeSlotCount: number;
    priceRuleCount: number;
  }>;
}

function toMinute(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export class CreateFootballFieldUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly fieldRepository: IFieldRepository,
    private readonly subFieldRepository: ISubFieldRepository,
    private readonly operatingHourRepository: IOperatingHourRepository,
    private readonly priceRuleRepository: IPriceRuleRepository,
    private readonly fieldService: FieldService, // only used for slug + validation (reads outside tx)
  ) {}

  async execute(
    ownerId: string,
    dto: CreateFootballFieldCompleteDto,
  ): Promise<CreateFootballFieldResult> {
    // ── Step 1: Pre-flight checks OUTSIDE the transaction ────────────────────
    const owner = await this.fieldRepository.findOwner(ownerId);
    if (!owner) {
      throw new BadRequestException('Owner not found');
    }

    const category = await this.fieldRepository.findCategoryById(dto.categoryId);
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    const slug = await this.fieldService.generateUniqueSlug(dto.name);
    this.validateTimeSlots(dto);

    // ── Step 2: ONE atomic Prisma transaction ────────────────────────────────
    try {
      const result = await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          // 2a. Create the FootballField
          const field = await this.fieldRepository.createFieldTx(
            tx,
            ownerId,
            {
              name: dto.name,
              description: dto.description ?? undefined,
              categoryId: dto.categoryId,
              address: dto.address,
              province: dto.province,
              district: dto.district,
              ward: dto.ward ?? undefined,
              latitude: dto.latitude ?? undefined,
              longitude: dto.longitude ?? undefined,
              openTime: dto.openTime,
              closeTime: dto.closeTime,
            },
            slug,
          );

          // 2b. Bulk-insert all field images
          const imagesBatch = await this.fieldRepository.createFieldImagesTx(
            tx,
            field.id,
            dto.images,
          );

          // 2c. Create each yard with its time slots + one price rule per slot
          const yardResults: CreateFootballFieldResult['yards'] = [];

          for (const yardDto of dto.yards) {
            const existingYards = await this.subFieldRepository.findSubfieldByTypeTx(
              tx,
              yardDto.type as YardType,
              field.id,
            );

            const maxNumber = existingYards.reduce((max, y) => {
              const match = y.code.match(/\d+$/);
              const num = match ? Number(match[0]) : 0;
              return Math.max(max, num);
            }, 0);

            const prefix = YARD_CODE_PREFIX[yardDto.type as YardType];
            const code = `${prefix}_${maxNumber + 1}`;

            const yard = await this.subFieldRepository.createSubfieldTx(
              tx,
              field.id,
              { name: yardDto.name, type: yardDto.type as YardType },
              code,
            );

            const timeSlots =
              await this.operatingHourRepository.createManyOperatingHoursTx(
                tx,
                yard.id,
                yardDto.timeSlots,
              );

            // Mỗi time slot có đúng 1 price rule (quan hệ 1-1)
            for (let index = 0; index < timeSlots.length; index += 1) {
              await this.priceRuleRepository.createPriceRuleTx(
                tx,
                timeSlots[index].id,
                yardDto.timeSlots[index].priceRule,
              );
            }

            yardResults.push({
              yard,
              timeSlotCount: timeSlots.length,
              priceRuleCount: timeSlots.length,
            });
          }

          return {
            field,
            imageCount: imagesBatch.count,
            yards: yardResults,
          };
        },
        { timeout: 15000 },
      );

      // Notify all admins about new field creation awaiting approval
      notifyAllAdmins(this.prisma, {
        actorId: ownerId,
        entityType: 'FootballField',
        entityId: result.field.id,
        type: 'FIELD_WAITING_APPROVAL',
        title: 'Có sân bóng mới cần phê duyệt.',
        content: `Sân "${result.field.name}" vừa được tạo và đang chờ duyệt.`,
      }).catch(() => {});

      return result;
    } catch (error) {
      // Transaction rollback rồi -> ảnh đã upload Cloudinary trước đó thành rác, cleanup
      if (dto.images?.length) {
        await Promise.allSettled(
          dto.images
            .filter((img) => img.publicId)
            .map((img) => deleteImageFromCloudinary(img.publicId!)),
        );
      }
      throw error;
    }
  }

  private validateTimeSlots(dto: CreateFootballFieldCompleteDto): void {
    if (!dto.openTime || !dto.closeTime) return;

    const fieldOpen = toMinute(dto.openTime);
    const fieldClose = toMinute(dto.closeTime);

    dto.yards.forEach((yard, yardIndex) => {
      const byDay = new Map<number, Array<{ start: number; end: number; index: number }>>();

      yard.timeSlots.forEach((slot, slotIndex) => {
        const start = toMinute(slot.startTime);
        const end = toMinute(slot.endTime);

        if (start >= end) {
          throw new BadRequestException(`yards.${yardIndex}.timeSlots.${slotIndex}.endTime must be after startTime`);
        }
        if (start < fieldOpen || end > fieldClose) {
          throw new BadRequestException(`yards.${yardIndex}.timeSlots.${slotIndex} must be inside field openTime/closeTime`);
        }

        const slots = byDay.get(slot.dayOfWeek) ?? [];
        const overlap = slots.find((item) => item.start < end && item.end > start);
        if (overlap) {
          throw new BadRequestException(
            `yards.${yardIndex}.timeSlots.${slotIndex} overlaps with timeSlots.${overlap.index}`,
          );
        }
        slots.push({ start, end, index: slotIndex });
        byDay.set(slot.dayOfWeek, slots);
      });
    });
  }
}