import { FieldYard, FootballField } from '@prisma/client';
import { CreateFieldYardDto, UpdateFieldYardDto } from '../dto/subfield.dto';

export interface ISubFieldRepository {
  createSubfield(data: CreateFieldYardDto, code: string): Promise<FieldYard>;

  updateSubfield(
    id: string,
    code: string,
    data: UpdateFieldYardDto,
  ): Promise<FieldYard>;

  deleteSubfield(id: string): Promise<FieldYard>;

  getSubfield(id: string): Promise<FieldYard>;

  getSubfields(page: number, limit: number): Promise<FieldYard[]>;

  findFieldByFieldId(field_id: string): Promise<FootballField>;

  findSubfieldByType(type: string, field_id: string): Promise<FieldYard[]>;

  findSubfieldsByFieldId(
    page: number,
    limit: number,
    field_id: string,
  ): Promise<FieldYard[]>;
  
  findFieldByOwnerId(ownerId: string): Promise<FootballField>;
}
