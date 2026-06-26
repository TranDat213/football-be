import { FieldYard, FootballField, Prisma, YardType } from '@prisma/client';
import { CreateFieldYardDto, UpdateFieldYardDto } from '../dto/subfield.dto';
import { YardCompleteDto } from '@/modules/field/dto/create-field-complete.dto';

export interface ISubFieldRepository {
  createSubfield(data: CreateFieldYardDto, code: string): Promise<FieldYard>;

  updateSubfield(
    id: string,
    code: string,
    data: UpdateFieldYardDto,
  ): Promise<FieldYard>;

  deleteSubfield(id: string): Promise<FieldYard>;

  getSubfield(id: string): Promise<FieldYard | null>;

  getSubfields(page: number, limit: number): Promise<FieldYard[]>;

  findFieldByFieldId(field_id: string): Promise<FootballField | null>;

  findSubfieldByType(type: string, field_id: string): Promise<FieldYard[]>;

  findSubfieldsByFieldId(
    page: number,
    limit: number,
    field_id: string,
  ): Promise<FieldYard[]>;
  
  findFieldByOwnerId(ownerId: string): Promise<FootballField | null>;

  // ── Transaction-aware methods (used by CreateFootballFieldUseCase) ──────────
  findSubfieldByTypeTx(
    tx: Prisma.TransactionClient,
    type: YardType,
    footballFieldId: string,
  ): Promise<FieldYard[]>;

  createSubfieldTx(
    tx: Prisma.TransactionClient,
    footballFieldId: string,
    data: Pick<YardCompleteDto, 'name' | 'type'>,
    code: string,
  ): Promise<FieldYard>;
}
