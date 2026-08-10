import { IFootballFieldUpdateRequestRepository } from '../domain/update-request.repository';
import { UpdateFootballFieldCompleteDto } from '@/modules/field/dto/update-field-complete.dto';
import { UpdateFootballFieldUseCase } from '@/modules/field/application/update-football-field.usecase';
import { IFieldRepository } from '@/modules/field/domain/field.repository';
import { ICategoryRepository } from '@/modules/field_category/domain/category.repository';
import {
  BadRequestException,
  InternalServerException,
} from '@/utils/app-error';
import { FieldStatus, FootballFieldUpdateRequestStatus, PrismaClient } from '@prisma/client';
import { notifyAllAdmins } from '@/modules/notification/application/notification.service';

export class FootballFieldUpdateRequestService {
  constructor(
    private readonly requestRepo: IFootballFieldUpdateRequestRepository,
    private readonly fieldRepo: IFieldRepository,
    private readonly categoryRepo: ICategoryRepository,
    private readonly updateFieldUseCase: UpdateFootballFieldUseCase,
    private readonly prisma?: PrismaClient,
  ) {}

  async createRequest(
    fieldId: string,
    ownerId: string,
    dto: UpdateFootballFieldCompleteDto,
  ) {
    // 1. Kiểm tra field tồn tại và thuộc owner
    const field = await this.fieldRepo.findById(fieldId);
    if (!field) {
      throw new BadRequestException('Không tìm thấy sân bóng.');
    }
    if (field.ownerId !== ownerId) {
      throw new BadRequestException(
        'Bạn không có quyền cập nhật sân này.',
      );
    }
    if (field.status !== FieldStatus.ACTIVE) {
      throw new BadRequestException('Sân bóng không ở trạng thái hoạt động.');
    }

    // 2. Chỉ cho phép 1 request PENDING tại 1 thời điểm
    const existingPending = await this.requestRepo.findByFieldIdAndStatus(
      fieldId,
      FootballFieldUpdateRequestStatus.PENDING,
    );
    if (existingPending) {
      throw new BadRequestException(
        'Đã có yêu cầu cập nhật đang chờ xử lý cho sân này.',
      );
    }

    // 3. Kiểm tra category tồn tại (nếu có thay đổi)
    if (dto?.categoryId) {
      const category = await this.categoryRepo.findById(dto.categoryId);
      if (!category) {
        throw new BadRequestException('Không tìm thấy danh mục.');
      }
    }

    // 4. Tạo request
    const request = await this.requestRepo.create({
      footballFieldId: fieldId,
      ownerId,
      payload: dto,
      status: FootballFieldUpdateRequestStatus.PENDING,
    });

    // Notify all admins about update request (fire-and-forget)
    if (this.prisma) {
      notifyAllAdmins(this.prisma, {
        entityType: 'FootballFieldUpdateRequest',
        entityId: request.id,
        type: 'FIELD_UPDATE_WAITING',
        title: 'Có phiếu cập nhật sân cần phê duyệt.',
        content: `Sân ${field.name} đã gửi yêu cầu cập nhật.`,
      }).catch(() => {});
    }

    return request;
  }

  async approveRequest(requestId: string, adminId: string) {
    const request = await this.requestRepo.findById(requestId);
    if (
      !request ||
      request.status !== FootballFieldUpdateRequestStatus.PENDING
    ) {
      throw new BadRequestException('Không tìm thấy yêu cầu cập nhật hoặc yêu cầu không ở trạng thái chờ.');
    }

    const payload =
      request.payload as unknown as UpdateFootballFieldCompleteDto;

    try {
      await this.updateFieldUseCase.execute(
        request.ownerId,
        request.footballFieldId,
        payload,
      );
    } catch (error) {
      console.log('applyUpdateRequest failed', error); // log full stack
      throw new InternalServerException(
        `Áp dụng cập nhật thất bại: ${error instanceof Error ? error.message : 'lỗi không xác định'}`,
      );
    }

    const updatedRequest = await this.requestRepo.updateStatus(requestId, {
      status: FootballFieldUpdateRequestStatus.CONFIRMED,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    });

    // Notify owner that update was approved
    if (this.prisma) {
      this.prisma.notification.create({
        data: {
          recipientId: request.ownerId,
          actorId: adminId,
          entityType: 'FootballFieldUpdateRequest',
          entityId: requestId,
          type: 'FIELD_CREATED_APPROVED' as any,
          title: 'Phếu tạo sân đã được duyệt.',
          content: 'Yêu cầu cập nhật sân của bạn đã được Admin phê duyệt.',
        },
      }).catch(() => {});
    }

    // 3. Soft delete request sau khi áp dụng thành công
    await this.requestRepo.softDelete(requestId);

    return updatedRequest;
  }

  async rejectRequest(requestId: string, adminId: string, reason: string) {
    const request = await this.requestRepo.findById(requestId);
    if (
      !request ||
      request.status !== FootballFieldUpdateRequestStatus.PENDING
    ) {
      throw new BadRequestException('Không tìm thấy yêu cầu cập nhật hoặc yêu cầu không ở trạng thái chờ.');
    }

    const updatedRequest = await this.requestRepo.updateStatus(requestId, {
      status: FootballFieldUpdateRequestStatus.REJECTED,
      reason,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    });

    await this.requestRepo.softDelete(requestId);

    return updatedRequest;
  }

  async listRequests(
    query: { status?: FootballFieldUpdateRequestStatus },
    page: number,
    limit: number,
  ) {
    return this.requestRepo.findPending(query, page, limit);
  }

  async softDelete(id: string) {
    const request = await this.requestRepo.findById(id);
    if (
      !request ||
      request.status !== FootballFieldUpdateRequestStatus.PENDING
    ) {
      throw new BadRequestException('Không tìm thấy yêu cầu cập nhật hoặc yêu cầu không ở trạng thái chờ.');
    }
    return await this.requestRepo.softDelete(id);
  }

  async listRequestsByOwnerId(
    ownerId: string,
    status: FootballFieldUpdateRequestStatus,
    page: number,
    limit: number,
  ) {
    return this.requestRepo.findByOwnerIdAndStatus(
      ownerId,
      status,
      page,
      limit,
    );
  }
}
