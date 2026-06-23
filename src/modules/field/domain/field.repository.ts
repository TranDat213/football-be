import {
  FieldCategory,
  FieldImage,
  FieldStatus,
  FootballField,
  User,
} from '@prisma/client';
import { CreateFieldImageDto, FieldDto, UpdateFieldDto, UpdateFieldImageDto } from '../dto/field.dto';

export interface IFieldRepository {
  createField(
    ownerId: string,
    data: FieldDto,
    slug: string,
  ): Promise<FootballField>;
  findByOwnerId(page:number, limit:number, ownerId: string): Promise<FootballField[]>;
  findOwner(ownerId: string): Promise<User | null>;
  findCategoryById(categoryId: string): Promise<FieldCategory | null>;
  updateField(
    fieldId: string,
    data: UpdateFieldDto,
    slug?: string,
  ): Promise<FootballField>;
  deleteField(fieldId: string): Promise<FootballField>;
  findById(fieldId: string): Promise<FootballField | null>;

  updateFieldStatus(
    fieldId: string,
    status: FieldStatus,
  ): Promise<FootballField>;

  createFieldImage(data: CreateFieldImageDto,imageUrl:string,imagePublicId:string): Promise<FieldImage>;
  updateFieldImage(fieldImageId: string, data: UpdateFieldImageDto,imageUrl:string | null,imagePublicId:string | null ): Promise<FieldImage>;
  deleteFieldImage(fieldImageId: string): Promise<FieldImage>;
  findFieldImageById(fieldImageId: string): Promise<FieldImage | null>;
  findFieldImagesByFieldId(page:number,limit:number,fieldId: string): Promise<FieldImage[]>;
  findFieldByOwnerId(ownerId: string): Promise<FootballField | null >;
  getAvailability(fieldId: string, date: Date): Promise<any>;
}
