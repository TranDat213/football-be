import {
  FieldCategory,
  FieldImage,
  FieldStatus,
  FootballField,
  Prisma,
  User,
} from '@prisma/client';
import {
  FieldDto,
  UpdateFieldDto,
  UpdateFieldImageDto,
} from '../dto/field.dto';
import {
  CreateFootballFieldCompleteDto,
  FieldImageCompleteDto,
} from '../dto/create-field-complete.dto';
import { CreateFootballFieldResult } from '../application/create-football-field.usecase';

export interface FieldActiveFilter {
  page?: number;
  limit?: number;
  keyword?: string;
  category?: string;
  yardType?: string;
  province?: string;
  district?: string;
  ward?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FieldPendingFilter {
  page?: number;
  limit?: number;
  keyword?: string;
  province?: string;
  district?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FieldOwnerFilter {
  page?: number;
  limit?: number;
  keyword?: string;
  district?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IFieldRepository {
  findByOwnerId(
    ownerId: string,
    filter: FieldOwnerFilter,
  ): Promise<{ data: FootballField[]; total: number }>;
  findOwner(ownerId: string): Promise<User | null>;
  findCategoryById(categoryId: string): Promise<FieldCategory | null>;
  findById(fieldId: string): Promise<FootballField | null>;

  updateFieldStatus(
    fieldId: string,
    status: FieldStatus,
  ): Promise<FootballField>;

  updateFieldStatusWithCascade(
    fieldId: string,
    status: FieldStatus,
  ): Promise<FootballField>;

  findFieldActiveStatus(
    filter: FieldActiveFilter,
  ): Promise<{ data: FootballField[]; total: number }>;
  findFieldPendingStatus(
    filter: FieldPendingFilter,
  ): Promise<{ data: FootballField[]; total: number }>;
  getFieldStatics(): Promise<any>;

  findFieldImageById(fieldImageId: string): Promise<FieldImage | null>;
  findFieldImagesByFieldId(
    page: number,
    limit: number,
    fieldId: string,
  ): Promise<FieldImage[]>;
  findFieldByOwnerId(ownerId: string): Promise<FootballField | null>;
  getAvailability(fieldId: string, date: Date): Promise<any>;

  findBySlug(slug: string): Promise<FootballField | null>;

  // ── Transaction-aware methods (used by CreateFootballFieldUseCase) ──────────
  createFieldTx(
    tx: Prisma.TransactionClient,
    ownerId: string,
    data: Pick<
      FieldDto,
      | 'name'
      | 'description'
      | 'address'
      | 'province'
      | 'district'
      | 'ward'
      | 'latitude'
      | 'longitude'
    > & {
      categoryId: string;
      openTime?: string;
      closeTime?: string;
    },
    slug: string,
  ): Promise<FootballField>;

  createFieldImagesTx(
    tx: Prisma.TransactionClient,
    fieldId: string,
    images: FieldImageCompleteDto[],
  ): Promise<Prisma.BatchPayload>;

  // ── Update-field transaction methods ──────────────────────────────────────────
  updateFieldTx(
    tx: Prisma.TransactionClient,
    fieldId: string,
    data: Partial<{
      name: string;
      description: string | null;
      categoryId: string;
      address: string;
      province: string;
      district: string;
      ward: string | null;
      latitude: number | null;
      longitude: number | null;
      openTime: string;
      closeTime: string;
      slug: string;
    }>,
  ): Promise<FootballField>;

  findFieldImagesTx(
    tx: Prisma.TransactionClient,
    fieldId: string,
  ): Promise<FieldImage[]>;

  deleteImagesTx(
    tx: Prisma.TransactionClient,
    imageIds: string[],
  ): Promise<void>;

  /** Returns true if ANY yard of this field has PENDING/CONFIRMED booking */
  hasActiveBookingsForFieldTx(
    tx: Prisma.TransactionClient,
    fieldId: string,
  ): Promise<boolean>;

  /** Soft-delete field + all yards/slots/priceRules in one tx step */
  softDeleteFieldTx(
    tx: Prisma.TransactionClient,
    fieldId: string,
  ): Promise<FootballField>;

  /** Cascade YardStatus.INACTIVE to all non-deleted yards of this field */
  inactivateYardsTx(
    tx: Prisma.TransactionClient,
    fieldId: string,
  ): Promise<void>;
}
