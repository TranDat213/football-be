import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../../../utils/app-error';
import { ICasualMatchRepository, BrowseFilter, OwnerFilter, ParticipationFilter } from '../domain/casual-match.repository';
import {
  CreateCasualMatchDto,
  UpdateCasualMatchDto,
  JoinCasualMatchDto,
  CancelParticipationDto,
  UpdateMatchStatusDto,
} from '../dto/casual-match.dto';
import { VNPayService } from '../../payment/application/vnpay.service';
import { BookingStatus, CasualMatchStatus, JoinStatus, ParticipantPayStatus, PrismaClient, SkillLevel, TeamMode, UserRole, Visibility } from '@prisma/client';
import { IExternalIPNHandler, ReturnResult } from '../../payment/domain/ipn-handler.interface';

const MAX_SLOTS: Record<string, number> = {
  FIVE_A_SIDE: 9,
  SEVEN_A_SIDE: 13,
  ELEVEN_A_SIDE: 21,
};

// Divisor used to calculate max slotPrice per yard type
// e.g. FIVE_A_SIDE: totalPrice / 10 = max price per slot
const PRICE_DIVISORS: Record<string, number> = {
  FIVE_A_SIDE: 10,
  SEVEN_A_SIDE: 14,
  ELEVEN_A_SIDE: 22,
};

function getMatchStart(bookingDate: Date, startTime: Date): Date {
  const matchStart = new Date(bookingDate);
  matchStart.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
  return matchStart;
}

export class CasualMatchService implements IExternalIPNHandler {
  constructor(
    private readonly repo: ICasualMatchRepository,
    private readonly prisma: PrismaClient,
    private readonly vnpayService: VNPayService,
  ) {}

  private _validateJoinDeadline(joinDeadlineStr: string | undefined, booking: { bookingDate: Date; startTime: Date }) {
    if (!joinDeadlineStr) return;
    const now = new Date();
    const joinDeadline = new Date(joinDeadlineStr);
    const matchStart = getMatchStart(booking.bookingDate, booking.startTime);

    if (joinDeadline < now || joinDeadline > new Date(matchStart.getTime() - 60 * 60 * 1000)) {
      throw new BadRequestException('Hạn tham gia phải nhỏ hơn thời gian bắt đầu trận ít nhất 1 giờ.');
    }
  }

  private async _syncExpiredStatuses() {
    try {
      const now = new Date();
      const matches = await this.prisma.casualMatch.findMany({
        where: {
          status: { in: [CasualMatchStatus.OPEN, CasualMatchStatus.FULL, CasualMatchStatus.STARTED] },
          deletedAt: null,
        },
        include: { booking: true },
      });

      for (const m of matches) {
        const matchStart = getMatchStart(m.booking.bookingDate, m.booking.startTime);
        const matchEnd = getMatchStart(m.booking.bookingDate, m.booking.endTime);

        let newStatus: CasualMatchStatus | null = null;
        if (now >= matchEnd) {
          newStatus = CasualMatchStatus.FINISHED;
        } else if (now >= matchStart && m.status !== CasualMatchStatus.STARTED) {
          newStatus = CasualMatchStatus.STARTED;
        }

        if (newStatus && m.status !== newStatus) {
          await this.prisma.casualMatch.update({
            where: { id: m.id },
            data: {
              status: newStatus,
              ...(newStatus === CasualMatchStatus.STARTED && { startedAt: now }),
              ...(newStatus === CasualMatchStatus.FINISHED && { finishedAt: now }),
            },
          });
        }
      }
    } catch (err) {
      console.error('Error syncing casual match statuses:', err);
    }
  }

  // ─── 1. Create Casual Match ────────────────────────────────────────────────
  async create(userId: string, dto: CreateCasualMatchDto) {
    // Verify booking exists, belongs to user, is CONFIRMED, has no existing match
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { fieldYard: true },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.userId !== userId) throw new ForbiddenException('Bạn không phải chủ booking này');
    if (booking.status !== BookingStatus.CONFIRMED) throw new BadRequestException('Booking phải ở trạng thái CONFIRMED');
    if (booking.paymentStatus !== 'PAID') throw new BadRequestException('Booking chưa được thanh toán');

    const existing = await this.repo.findByBookingId(dto.bookingId);
    if (existing) throw new BadRequestException('Booking này đã tạo trận vãng lai.');

    // Validate slots limit
    const yardType = booking.fieldYard.type;
    const maxSlots = MAX_SLOTS[yardType] ?? 9;
    if (dto.totalSlots > maxSlots) {
      throw new BadRequestException(`Số slot tối đa cho loại sân ${yardType} là ${maxSlots}`);
    }

    // Validate joinDeadline
    this._validateJoinDeadline(dto.joinDeadline, booking);

    const totalSlots = dto.totalSlots;

    // Max slotPrice = totalPrice / divisor (fixed per yard type)
    const totalPrice = Number(booking.totalPrice);
    const divisor = PRICE_DIVISORS[yardType] ?? 10;
    const maxSlotPrice = Math.floor(totalPrice / divisor);

    // If user provides a custom slotPrice, it must not exceed maxSlotPrice
    if (dto.slotPrice !== undefined && dto.slotPrice > maxSlotPrice) {
      throw new BadRequestException(
        `Giá slot không được vượt quá ${maxSlotPrice.toLocaleString('vi-VN')} VNĐ (tổng tiền / ${divisor})`,
      );
    }

    const slotPrice = dto.slotPrice ?? maxSlotPrice;

    return this.repo.create({
      booking: { connect: { id: dto.bookingId } },
      host: { connect: { id: userId } },
      title: dto.title,
      description: dto.description,
      totalSlots,
      availableSlots: totalSlots,
      occupiedSlots: 0,
      slotPrice,
      skillLevel: dto.skillLevel ?? SkillLevel.ANY,
      visibility: dto.visibility ?? Visibility.PUBLIC,
      status: CasualMatchStatus.OPEN,
      teamMode: dto.teamMode ?? TeamMode.NO_TEAM,
      joinDeadline: dto.joinDeadline ? new Date(dto.joinDeadline) : null,
    });
  }

  // ─── 2. Browse open matches ────────────────────────────────────────────────
  async browse(filter: BrowseFilter) {
    await this._syncExpiredStatuses();
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
    await this._syncExpiredStatuses();
    const match = await this.repo.findById(id);
    if (!match) throw new NotFoundException('Casual Match không tồn tại');
    return match;
  }

  // ─── 4. Host's matches ────────────────────────────────────────────────────
  async getByHostId(hostId: string, filter: OwnerFilter) {
    await this._syncExpiredStatuses();
    const { data, total } = await this.repo.findByHostId(hostId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getByOwnerId(ownerId: string, filter: OwnerFilter) {
    await this._syncExpiredStatuses();
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

    if (dto.joinDeadline !== undefined) {
      this._validateJoinDeadline(dto.joinDeadline, match.booking);
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

  // ─── 7. Join + init payment (1 atomic flow) ────────────────────────────────
  async join(casualMatchId: string, userId: string, dto: JoinCasualMatchDto, ip: string) {
    const slotCount = dto.slotCount ?? 1;

    const { participant, paymentUrl } = await this.prisma.$transaction(async (tx) => {
      // Lock the match row
      const match = await tx.casualMatch.findUnique({
        where: { id: casualMatchId },
        include: { booking: { include: { fieldYard: true } } },
      });
      if (!match || match.deletedAt) throw new NotFoundException('Casual Match không tồn tại');
      if (match.hostId === userId) throw new ForbiddenException('Chủ trận không thể tham gia trận của mình');
      if (match.status !== CasualMatchStatus.OPEN) throw new BadRequestException('Trận đấu không còn nhận đăng ký');
      if (match.booking.status !== BookingStatus.CONFIRMED) throw new BadRequestException('Booking không còn hợp lệ');

      // Deadline check
      if (match.joinDeadline && new Date() > match.joinDeadline) {
        throw new BadRequestException('Đã quá hạn đăng ký');
      }

      // Slot availability & limits
      const yardType = match.booking.fieldYard.type;
      const maxSlots = MAX_SLOTS[yardType] ?? 9;
      if (match.occupiedSlots + slotCount > match.totalSlots) {
        throw new BadRequestException('Trận đã đủ người.');
      }
      if (match.occupiedSlots + slotCount > maxSlots) {
        throw new BadRequestException('Trận đã đủ người.');
      }
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
      const reservedUntil = new Date(Date.now() + 15 * 60 * 1000);

      // Create participant row
      const participant = await tx.casualMatchParticipant.create({
        data: {
          casualMatch: { connect: { id: casualMatchId } },
          user: { connect: { id: userId } },
          slotCount,
          unitPrice,
          totalAmount,
          paymentStatus: ParticipantPayStatus.UNPAID,
          joinStatus: JoinStatus.PENDING,
          selectedTeam: dto.selectedTeam ?? null,
          reservedUntil,
        },
      });

      // Atomic slot update
      const updated = await tx.casualMatch.updateMany({
        where: { id: casualMatchId, availableSlots: { gte: slotCount } },
        data: {
          occupiedSlots: { increment: slotCount },
          availableSlots: { decrement: slotCount },
        },
      });

      if (updated.count === 0) {
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

      const paymentUrl = this.vnpayService.createPaymentUrl(
        ip,
        `CMATCH_${participant.id}`,
        totalAmount,
      );

      return { participant, paymentUrl };
    });

    return {
      participant,
      paymentUrl,
      paymentInfo: {
        participantId: participant.id,
        totalAmount: Number(participant.totalAmount),
        slotCount,
        unitPrice: Number(participant.unitPrice),
        message: 'Đăng ký thành công. Đang chuyển sang trang thanh toán.',
      },
    };
  }

  // ─── 8. Init participant payment (VNPay) — kept for backward compat ─────────
  async initPayment(casualMatchId: string, userId: string, ip: string) {
    const participant = await this.prisma.casualMatchParticipant.findUnique({
      where: { casualMatchId_userId: { casualMatchId, userId } },
    });
    if (!participant) throw new NotFoundException('Bạn chưa đăng ký trận này');
    if (participant.paymentStatus === ParticipantPayStatus.PAID) throw new BadRequestException('Bạn đã thanh toán rồi');

    const paymentUrl = this.vnpayService.createPaymentUrl(
      ip,
      `CMATCH_${participant.id}`,
      Number(participant.totalAmount),
    );

    return { paymentUrl, participantId: participant.id, amount: participant.totalAmount };
  }

  // ─── 9. IPN handler ────────────────────────────────────────────────────────

  matches(txnRef: string): boolean {
    return txnRef.startsWith('CMATCH_');
  }

  async handle(query: any): Promise<{ RspCode: string; Message: string }> {
    try {
      const txnRef: string = query['vnp_TxnRef'];
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
        if (participant.paymentStatus === ParticipantPayStatus.PAID) return;
        if (Number(participant.totalAmount) !== amount) throw new Error('Amount mismatch');

        await tx.casualMatchParticipant.update({
          where: { id: participantId },
          data: {
            paymentStatus: ParticipantPayStatus.PAID,
            joinStatus: JoinStatus.APPROVED,
            joinedAt: new Date(),
            transactionCode: query['vnp_TransactionNo'] as string,
            gatewayResponse: query,
            paidAt: new Date(),
          },
        });

        const match = await tx.casualMatch.findUnique({
          where: { id: participant.casualMatchId },
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
              content: 'Có người đã thanh toán và tham gia trận vãng lai của bạn',
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

  // ─── 10. Return URL handler ───────────────────────────────────────────────
  matchesReturn(txnRef: string): boolean {
    return txnRef.startsWith('CMATCH_');
  }

  async handleReturn(query: any): Promise<ReturnResult> {
    const txnRef = query['vnp_TxnRef'] as string;
    const participantId = txnRef.replace('CMATCH_', '');
    const amount = Number(query['vnp_Amount']) / 100;
    const responseCode = query['vnp_ResponseCode'] as string;

    return {
      success: responseCode === '00',
      responseCode,
      entityId: participantId,
      entityType: 'casual_match',
      amount,
      message: responseCode === '00' ? 'Thanh toán thành công' : 'Thanh toán thất bại hoặc bị huỷ',
    };
  }

  // ─── 11. Participant cancel ────────────────────────────────────────────────
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

      await tx.casualMatchParticipant.update({
        where: { id: participant.id },
        data: {
          joinStatus: JoinStatus.CANCELLED,
          cancelledAt: new Date(),
          paymentStatus: participant.paymentStatus === ParticipantPayStatus.PAID ? ParticipantPayStatus.REFUND_PENDING : participant.paymentStatus,
        },
      });

      await tx.casualMatch.update({
        where: { id: casualMatchId },
        data: {
          occupiedSlots: { decrement: participant.slotCount },
          availableSlots: { increment: participant.slotCount },
          status: match.status === CasualMatchStatus.FULL ? CasualMatchStatus.OPEN : match.status,
        },
      });

      return {
        success: true,
        refundInitiated: participant.paymentStatus === ParticipantPayStatus.PAID,
        message: participant.paymentStatus === ParticipantPayStatus.PAID
          ? 'Huỷ thành công. Hoàn tiền đang được xử lý.'
          : 'Huỷ thành công.',
      };
    });
  }

  // ─── 12. Update status ───────────────────────────────────────────────────
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

  // ─── 13. Participation history ────────────────────────────────────────────
  async getParticipations(userId: string, filter: ParticipationFilter) {
    await this._syncExpiredStatuses();
    const { data, total } = await this.repo.findByParticipantUserId(userId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── 14. Match participant list (host/owner only) ─────────────────────────
  async getMatchParticipants(matchId: string, requesterId: string) {
    const match = await this.prisma.casualMatch.findUnique({
      where: { id: matchId, deletedAt: null },
      include: {
        booking: { include: { fieldYard: { include: { footballField: true } } } },
      },
    });
    if (!match) throw new NotFoundException('Casual Match không tồn tại');

    const isHost = match.hostId === requesterId;
    const isOwner = match.booking.fieldYard.footballField.ownerId === requesterId;
    if (!isHost && !isOwner) throw new ForbiddenException('Chỉ host hoặc chủ sân mới được xem');

    const participants = await this.repo.findParticipantsByMatchId(matchId);
    return { match, participants };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  private async _getMatchOrFail(id: string) {
    const match = await this.prisma.casualMatch.findUnique({
      where: { id, deletedAt: null },
      include: { booking: true },
    });
    if (!match) throw new NotFoundException('Casual Match không tồn tại');
    return match;
  }

  private _assertHost(match: { hostId: string }, userId: string) {
    if (match.hostId !== userId) throw new ForbiddenException('Chỉ chủ trận mới có quyền thực hiện');
  }
}
