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

export interface CreateFootballFieldResult {
  field: any;
  imageCount: number;
  yards: Array<{
    yard: any;
    operatingHourCount: number;
    priceRuleCount: number;
  }>;
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
    // These are read-only operations and do not need to be inside a tx.
    const owner = await this.fieldRepository.findOwner(ownerId);
    if (!owner) {
      throw new BadRequestException('Owner not found');
    }

    const category = await this.fieldRepository.findCategoryById(dto.categoryId);
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    // Generate unique slug before the transaction to avoid repeated DB checks inside tx
    const slug = await this.fieldService.generateUniqueSlug(dto.name);

    // ── Step 2: ONE atomic Prisma transaction ────────────────────────────────
    // Every repository method below receives `tx` — a shared TransactionClient.
    // No repository creates a new PrismaClient; all writes share the same connection.
    // If ANY step throws, Prisma rolls back ALL 5 tables automatically.
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
            latitude: dto.latitude,
            longitude: dto.longitude,
            openTime: dto.openTime,
            closeTime: dto.closeTime,
          },
          slug,
        );

        // 2b. Bulk-insert all field images (single round-trip via createMany)
        const imagesBatch = await this.fieldRepository.createFieldImagesTx(
          tx,
          field.id,
          dto.images,
        );

        // 2c. Create each yard with its operating hours + price rules
        const yardResults: CreateFootballFieldResult['yards'] = [];

        for (const yardDto of dto.yards) {
          // Generate code for this yard type within the same transaction
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

          // Bulk-insert operating hours for this yard (createMany)
          const hoursBatch =
            await this.operatingHourRepository.createManyOperatingHoursTx(
              tx,
              yard.id,
              yardDto.operatingHours,
            );

          // Bulk-insert price rules for this yard (createMany)
          const rulesBatch =
            await this.priceRuleRepository.createManyPriceRulesTx(
              tx,
              yard.id,
              yardDto.priceRules,
            );

          yardResults.push({
            yard,
            operatingHourCount: hoursBatch.count,
            priceRuleCount: rulesBatch.count,
          });
        }

        return {
          field,
          imageCount: imagesBatch.count,
          yards: yardResults,
        };
      },
      { timeout: 15000 }, // generous timeout for large submissions
    );

    return result;
  }
}
