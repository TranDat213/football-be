import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../../../utils/app-error';
import { ICasualMatchRepository, BrowseFilter, OwnerFilter } from '../domain/casual-match.repository';
import {
  CreateCasualMatchDto,
  UpdateCasualMatchDto,
  JoinCasualMatchDto,
  CancelParticipationDto,
  UpdateMatchStatusDto,
} from '../dto/casual-match.dto';
import { VNPayService } from '../../payment/application/vnpay.service';
import { BookingStatus, CasualMatchStatus, JoinStatus, PaymentStatus, PrismaClient, SkillLevel, TeamMode, UserRole, Visibility } from '@prisma/client';

export class CasualMatchService {
  constructor(
    private readonly repo: ICasualMatchRepository,
    private readonly prisma: PrismaClient,
    private readonly vnpayService: VNPayService,
  ) {}

  // ─── 1. Create Casual Match ────────────────────────────────────────────────
  async create(userId: string, dto: CreateCasualMatchDto) {
    // Verify booking exists, belongs to user, is CONFIRMED, has no existing match
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.userId !== userId) throw new ForbiddenException('Bạn không phải chủ booking này');
    if (booking.status !== BookingStatus.CONFIRMED) throw new BadRequestException('Booking phải ở trạng thái CONFIRMED');
    if (booking.paymentStatus !== PaymentStatus.PAID) throw new BadRequestException('Booking chưa được thanh toán');

    const existing = await this.repo.findByBookingId(dto.bookingId);
    if (existing) throw new BadRequestException('Booking này đã có Casual Match');

    const totalSlots = dto.totalSlots;
    return this.repo.create({
      booking: { connect: { id: dto.bookingId } },
      host: { connect: { id: userId } },
      title: dto.title,
      description: dto.description,
      totalSlots,
      availableSlots: totalSlots,
      occupiedSlots: 0,
      slotPrice: dto.slotPrice,
      skillLevel: dto.skillLevel ?? SkillLevel.ANY,
      visibility: dto.visibility ?? Visibility.PUBLIC,
      status: CasualMatchStatus.OPEN,
      teamMode: dto.teamMode ?? TeamMode.NO_TEAM,
      joinDeadline: dto.joinDeadline ? new Date(dto.joinDeadline) : null,
    });
  }

  // ─── 2. Browse open matches ────────────────────────────────────────────────
  async browse(filter: BrowseFilter) {
    const { data, total } = await this.repo.findOpenMatches(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── 3. Get detail ─────────────────────────────────────────────────────────
  async getById(id: string) {
    const match = await this.repo.findById(id);
    if (!match) throw new NotFoundException('Casual Match không tồn tại');
    return match;
  }

  // ─── 4. Host's matches ────────────────────────────────────────────────────
  async getByHostId(hostId: string, filter: OwnerFilter) {
    const { data, total } = await this.repo.findByHostId(hostId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getByOwnerId(ownerId: string, filter: OwnerFilter) {
    const { data, total } = await this.repo.findByOwnerId(ownerId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
      

  // ─── 5. Update (owner only, guard if participants joined) ──────────────────
  async update(id: string, userId: string, dto: UpdateCasualMatchDto) {
    const match = await this._getMatchOrFail(id);
    this._assertHost(match, userId);

    // Cannot change slotPrice if any participant has already joined
    if (dto.slotPrice !== undefined && match.occupiedSlots > 0) {
      throw new BadRequestException('Không thể thay đổi giá slot khi đã có người tham gia');
    }

    return this.repo.update(id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.slotPrice !== undefined && { slotPrice: dto.slotPrice }),
      ...(dto.joinDeadline !== undefined && { joinDeadline: dto.joinDeadline ? new Date(dto.joinDeadline) : null }),
      ...(dto.visibility !== undefined && { visibility: dto.visibility }),
      ...(dto.teamMode !== undefined && { teamMode: dto.teamMode }),
      ...(dto.skillLevel !== undefined && { skillLevel: dto.skillLevel }),
    });
  }

  // ─── 6. Soft delete ────────────────────────────────────────────────────────
  async remove(id: string, userId: string) {
    const match = await this._getMatchOrFail(id);
    this._assertHost(match, userId);

    if (match.occupiedSlots > 0) {
      throw new BadRequestException('Không thể xoá khi đã có người tham gia');
    }
    if (match.status === CasualMatchStatus.STARTED) {
      throw new BadRequestException('Không thể xoá trận đấu đang diễn ra');
    }

    return this.repo.softDelete(id);
  }

  // ─── 7. Join ───────────────────────────────────────────────────────────────
  async join(casualMatchId: string, userId: string, dto: JoinCasualMatchDto) {
    const slotCount = dto.slotCount ?? 1;

    return this.prisma.$transaction(async (tx) => {
      // Lock the match row
      const match = await tx.casualMatch.findUnique({
        where: { id: casualMatchId },
        include: { booking: true },
      });
      if (!match || match.deletedAt) throw new NotFoundException('Casual Match không tồn tại');
      if (match.hostId === userId) throw new ForbiddenException('Chủ trận không thể tham gia trận của mình');
      if (match.status !== CasualMatchStatus.OPEN) throw new BadRequestException('Trận đấu không còn nhận đăng ký');
      if (match.booking.status !== BookingStatus.CONFIRMED) throw new BadRequestException('Booking không còn hợp lệ');

      // Deadline check
      if (match.joinDeadline && new Date() > match.joinDeadline) {
        throw new BadRequestException('Đã quá hạn đăng ký');
      }

      // Slot availability (atomic guard via UPDATE with WHERE clause below)
      if (match.availableSlots < slotCount) {
        throw new BadRequestException(`Chỉ còn ${match.availableSlots} slot trống`);
      }

      // Prevent duplicate
      const existing = await tx.casualMatchParticipant.findUnique({
        where: { casualMatchId_userId: { casualMatchId, userId } },
      });
      if (existing && existing.deletedAt === null) {
        throw new BadRequestException('Bạn đã đăng ký trận đấu này rồi');
      }

      // Team validation
      if (match.teamMode === 'REQUIRED_TEAM' && !dto.selectedTeam) {
        throw new BadRequestException('Phải chọn đội khi teamMode là REQUIRED_TEAM');
      }

      const unitPrice = Number(match.slotPrice);
      const totalAmount = unitPrice * slotCount;

      // Create participant row
      const participant = await tx.casualMatchParticipant.create({
        data: {
          casualMatch: { connect: { id: casualMatchId } },
          user: { connect: { id: userId } },
          slotCount,
          unitPrice,
          totalAmount,
          paymentStatus: PaymentStatus.UNPAID,
          joinStatus: JoinStatus.PENDING,
          selectedTeam: dto.selectedTeam ?? null,
        },
      });

      // Atomic slot update (safe: decrement only if available_slots >= slotCount)
      const updated = await tx.casualMatch.updateMany({
        where: { id: casualMatchId, availableSlots: { gte: slotCount } },
        data: {
          occupiedSlots: { increment: slotCount },
          availableSlots: { decrement: slotCount },
        },
      });

      if (updated.count === 0) {
        // Race condition — another request grabbed the last slots
        throw new BadRequestException('Slot vừa hết, vui lòng thử lại');
      }

      // Mark FULL if no slots left
      const refreshed = await tx.casualMatch.findUnique({ where: { id: casualMatchId } });
      if (refreshed && refreshed.availableSlots === 0) {
        await tx.casualMatch.update({
          where: { id: casualMatchId },
          data: { status: CasualMatchStatus.FULL },
        });
      }

      return {
        participant,
        paymentInfo: {
          participantId: participant.id,
          totalAmount,
          slotCount,
          unitPrice,
          message: 'Đăng ký thành công. Vui lòng thanh toán để xác nhận chỗ.',
        },
      };
    });
  }

  // ─── 8. Init participant payment (VNPay) ───────────────────────────────────
  async initPayment(casualMatchId: string, userId: string, ip: string) {
    const participant = await this.prisma.casualMatchParticipant.findUnique({
      where: { casualMatchId_userId: { casualMatchId, userId } },
    });
    if (!participant) throw new NotFoundException('Bạn chưa đăng ký trận này');
    if (participant.paymentStatus === PaymentStatus.PAID) throw new BadRequestException('Bạn đã thanh toán rồi');

    // Use participant.id as vnp_TxnRef so IPN can identify it
    const paymentUrl = this.vnpayService.createPaymentUrl(
      ip,
      `CMATCH_${participant.id}`,
      Number(participant.totalAmount),
    );

    return { paymentUrl, participantId: participant.id, amount: participant.totalAmount };
  }

  // ─── 9. IPN handler ────────────────────────────────────────────────────────
  async handleIPN(query: any): Promise<{ RspCode: string; Message: string }> {
    try {
      const isValid = this.vnpayService.verifyChecksum(query);
      if (!isValid) return { RspCode: '97', Message: 'Invalid Checksum' };

      const txnRef: string = query['vnp_TxnRef'];
      if (!txnRef.startsWith('CMATCH_')) return { RspCode: '01', Message: 'Not a CasualMatch payment' };

      const participantId = txnRef.replace('CMATCH_', '');
      const amount = Number(query['vnp_Amount']) / 100;
      const responseCode: string = query['vnp_ResponseCode'];
      const transactionStatus: string = query['vnp_TransactionStatus'];

      if (responseCode !== '00' || transactionStatus !== '00') {
        return { RspCode: '00', Message: 'Confirm Success' };
      }

      await this.prisma.$transaction(async (tx) => {
        const participant = await tx.casualMatchParticipant.findUnique({ where: { id: participantId } });
        if (!participant) throw new Error('Participant not found');
        if (participant.paymentStatus === PaymentStatus.PAID) return; // idempotent

        if (Number(participant.totalAmount) !== amount) throw new Error('Amount mismatch');

        // Update participant
        await tx.casualMatchParticipant.update({
          where: { id: participantId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            joinStatus: JoinStatus.APPROVED,
            joinedAt: new Date(),
          },
        });

        // Notify host (fire-and-forget — outside tx would be ideal but kept simple)
        const match = await tx.casualMatch.findUnique({
          where: { id: participant.casualMatchId },
          include: { host: { select: { id: true } } },
        });

        if (match) {
          await tx.notification.create({
            data: {
              recipientId: match.hostId,
              actorId: participant.userId,
              entityType: 'CasualMatch',
              entityId: match.id,
              type: 'MATCH_JOINED',
              title: 'Người chơi mới đã tham gia trận của bạn',
              content: `Có người đã thanh toán và tham gia trận vãng lai của bạn`,
            },
          });
        }
      });

      return { RspCode: '00', Message: 'Confirm Success' };
    } catch (err) {
      console.error('CasualMatch IPN error:', err);
      return { RspCode: '99', Message: 'Unknown Error' };
    }
  }

  // ─── 10. Participant cancel ────────────────────────────────────────────────
  async cancelParticipation(casualMatchId: string, userId: string, _dto: CancelParticipationDto) {
    return this.prisma.$transaction(async (tx) => {
      const participant = await tx.casualMatchParticipant.findUnique({
        where: { casualMatchId_userId: { casualMatchId, userId } },
      });
      if (!participant || participant.deletedAt) throw new NotFoundException('Bạn chưa đăng ký trận này');
      if (participant.joinStatus === JoinStatus.CANCELLED) throw new BadRequestException('Đã huỷ trước đó rồi');

      const match = await tx.casualMatch.findUnique({ where: { id: casualMatchId } });
      if (!match) throw new NotFoundException('Casual Match không tồn tại');

      const isPastDeadline = match.joinDeadline && new Date() > match.joinDeadline;
      if (isPastDeadline) throw new BadRequestException('Đã quá hạn, không thể huỷ');

      // Update participant
      await tx.casualMatchParticipant.update({
        where: { id: participant.id },
        data: {
          joinStatus: JoinStatus.CANCELLED,
          cancelledAt: new Date(),
          paymentStatus: participant.paymentStatus === PaymentStatus.PAID ? PaymentStatus.REFUND_PENDING : participant.paymentStatus,
        },
      });

      // Return slots
      await tx.casualMatch.update({
        where: { id: casualMatchId },
        data: {
          occupiedSlots: { decrement: participant.slotCount },
          availableSlots: { increment: participant.slotCount },
          // Re-open if was FULL
          status: match.status === CasualMatchStatus.FULL ? CasualMatchStatus.OPEN : match.status,
        },
      });

      return {
        success: true,
        refundInitiated: participant.paymentStatus === PaymentStatus.PAID,
        message: participant.paymentStatus === PaymentStatus.PAID
          ? 'Huỷ thành công. Hoàn tiền đang được xử lý.'
          : 'Huỷ thành công.',
      };
    });
  }

  // ─── 11. Update status (owner or admin) ───────────────────────────────────
  async updateStatus(id: string, userId: string, userRole: string, dto: UpdateMatchStatusDto) {
    const match = await this._getMatchOrFail(id);

    if (userRole !== UserRole.ADMIN) {
      this._assertHost(match, userId);
    }

    return this.repo.update(id, {
      status: dto.status,
      ...(dto.status === CasualMatchStatus.STARTED && { startedAt: new Date() }),
      ...(dto.status === CasualMatchStatus.FINISHED && { finishedAt: new Date() }),
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  private async _getMatchOrFail(id: string) {
    const match = await this.prisma.casualMatch.findUnique({ where: { id, deletedAt: null } });
    if (!match) throw new NotFoundException('Casual Match không tồn tại');
    return match;
  }

  private _assertHost(match: { hostId: string }, userId: string) {
    if (match.hostId !== userId) throw new ForbiddenException('Chỉ chủ trận mới có quyền thực hiện');
  }
}
