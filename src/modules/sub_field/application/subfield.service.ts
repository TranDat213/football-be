import { FieldYard } from '@prisma/client';
import { ISubFieldRepository } from '../domain/subfield.repository';
import {
  BadRequestException,
  InternalServerException,
} from '@/utils/app-error';
import { YardType } from '@prisma/client';
import { YARD_CODE_PREFIX } from '@/constants/yard.constant';

export class SubFieldService {
  constructor(private readonly subFieldRepository: ISubFieldRepository) {}
  async generateCode(footballFieldId: string, type: YardType): Promise<string> {
    try {
      const prefix = YARD_CODE_PREFIX[type];
      const subfields = await this.subFieldRepository.findSubfieldByType(
        type,
        footballFieldId,
      );
      let maxNumber = 0;

      for (const yard of subfields) {
        const match = yard.code.match(/\d+$/);

        if (match) {
          const number = Number(match[0]);
          maxNumber = Math.max(maxNumber, number);
        }
      }

      return `${prefix}_${maxNumber + 1}`;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerException('Tạo mã sân con thất bại.');
    }
  }

  async getSubfield(id: string): Promise<FieldYard> {
    const subfield = await this.subFieldRepository.getSubfield(id);
    if (!subfield) {
      throw new BadRequestException('Không tìm thấy sân con.');
    }
    return subfield;
  }

  async getSubfields(page: number, limit: number): Promise<FieldYard[]> {
    return await this.subFieldRepository.getSubfields(page, limit);
  }

  async getSubfieldsByFieldId(
    page: number,
    limit: number,
    field_id: string,
  ): Promise<FieldYard[]> {
    const field = await this.subFieldRepository.findFieldByFieldId(field_id);
    if (!field) {
      throw new BadRequestException('Không tìm thấy sân bóng.');
    }
    return await this.subFieldRepository.findSubfieldsByFieldId(
      page,
      limit,
      field_id,
    );
  }
}
