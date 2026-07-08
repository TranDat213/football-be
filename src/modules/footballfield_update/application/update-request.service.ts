import { IFootballFieldUpdateRequestRepository } from '../domain/update-request.repository';
import { UpdateFootballFieldCompleteDto } from '@/modules/field/dto/update-field-complete.dto';
import { UpdateFootballFieldUseCase } from '@/modules/field/application/update-football-field.usecase';
import { IFieldRepository } from '@/modules/field/domain/field.repository'; // sửa lại path đúng theo project

import { ICategoryRepository } from '@/modules/field_category/domain/category.repository';
import { BadRequestException, InternalServerException } from '@/utils/app-error';

export class FootballFieldUpdateRequestService {
  constructor(
    private readonly requestRepo: IFootballFieldUpdateRequestRepository,
    private readonly fieldRepo: IFieldRepository,
    private readonly categoryRepo: ICategoryRepository,
    private readonly updateFieldUseCase: UpdateFootballFieldUseCase,
  ) {}

  async createRequest(fieldId: string, ownerId: string, dto: UpdateFootballFieldCompleteDto) {
    // 1. Kiểm tra field tồn tại và thuộc owner
    const field = await this.fieldRepo.findById(fieldId);
    if (!field) {
      throw new BadRequestException('Football field not found');
    }
    if (field.ownerId !== ownerId) {
      throw new BadRequestException('You do not have permission to update this field');
    }

    // 2. Chỉ cho phép 1 request PENDING tại 1 thời điểm
    const existingPending = await this.requestRepo.findByFieldIdAndStatus(fieldId, 'PENDING');
    if (existingPending) {
      throw new BadRequestException('A pending update request already exists for this field');
    }

    // 3. Kiểm tra category tồn tại (nếu có thay đổi)
    if (dto?.categoryId) {
      const category = await this.categoryRepo.findById(dto.categoryId);
      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    // 4. Tạo request
    return this.requestRepo.create({
      footballFieldId: fieldId,
      ownerId,
      payload: dto,
      status: 'PENDING',
    });
  }

  async approveRequest(requestId: string, adminId: string) {
    const request = await this.requestRepo.findById(requestId);
    if (!request || request.status !== 'PENDING') {
      throw new BadRequestException('Update request not found or not pending');
    }

    const payload = request.payload as unknown as UpdateFootballFieldCompleteDto;

    // 1. Đánh dấu request đã CONFIRMED
    const updatedRequest = await this.requestRepo.updateStatus(requestId, {
      status: 'CONFIRMED',
      reviewedBy: adminId,
      reviewedAt: new Date(),
    });

    // 2. Áp dụng thay đổi vào FootballField (usecase này tự lo transaction riêng của nó
    //    vì nó ghi nhiều bảng — không liên quan tới bảng update-request)
    try {
      await this.updateFieldUseCase.execute(request.footballFieldId, request.ownerId, payload);
    } catch (error) {
      throw new InternalServerException(`Failed to apply updates`)
    }

    // 3. Soft delete request sau khi áp dụng thành công
    await this.requestRepo.softDelete(requestId);

    return updatedRequest;
  }

  async rejectRequest(requestId: string, adminId: string, reason: string) {
    const request = await this.requestRepo.findById(requestId);
    if (!request || request.status !== 'PENDING') {
      throw new BadRequestException('Update request not found or not pending');
    }

    const updatedRequest = await this.requestRepo.updateStatus(requestId, {
      status: 'REJECTED',
      reason,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    });

    await this.requestRepo.softDelete(requestId);

    return updatedRequest;
  }

  async listRequests(query: { status?: 'PENDING' | 'CONFIRMED' | 'REJECTED' }) {
    return this.requestRepo.findPending(query);
  }
}