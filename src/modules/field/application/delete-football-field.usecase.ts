import { Prisma, PrismaClient } from '@prisma/client';
import { IFieldRepository } from '../domain/field.repository';
import { BadRequestException } from '@/utils/app-error';
import { FieldStatus } from '@prisma/client';

export class DeleteFootballFieldUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly fieldRepository: IFieldRepository,
  ) {}

  async execute(ownerId: string, fieldId: string): Promise<{ message: string }> {
    // ── Pre-flight checks ────────────────────────────────────────────────────
    const field = await this.fieldRepository.findById(fieldId);
    if (!field) throw new BadRequestException('Field not found');
    if (field.ownerId !== ownerId) throw new BadRequestException('You do not own this field');
    if (field.deletedAt) throw new BadRequestException('Field has already been deleted');

    // Field must not be ACTIVE to allow deletion
    if (field.status === FieldStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot delete an ACTIVE field. Deactivate it first (set status to INACTIVE).',
      );
    }

    // ── Check active bookings across all yards in one query ──────────────────
    const hasBookings = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        return await this.fieldRepository.hasActiveBookingsForFieldTx(tx, fieldId);
      },
      { timeout: 5000 },
    );

    if (hasBookings) {
      throw new BadRequestException(
        'Cannot delete field — there are active bookings (PENDING/CONFIRMED) on its yards.',
      );
    }

    // ── Soft-delete in one transaction ───────────────────────────────────────
    await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // TODO: Permanent Delete Flow sẽ cleanup Cloudinary sau.
        await this.fieldRepository.softDeleteFieldTx(tx, fieldId);
      },
      { timeout: 15000 },
    );

    return { message: 'Field deleted successfully' };
  }
}
