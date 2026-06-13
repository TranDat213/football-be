import { Router } from 'express';
import { PrismaSubFieldRepository } from '@/modules/sub_field/infrastructure/prisma-subfield.repository';
import { SubFieldService } from '@/modules/sub_field/application/subfield.service';
import { SubFieldController } from '@/modules/sub_field/application/subfield.controller';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate.middleware';
import { authorize } from '@/middleware/authorize.middlerware';
import { UserRole } from '@prisma/client';
import { validateDto } from '@/middleware/validate-dto.middleware';
import {
  CreateFieldYardDto,
  UpdateFieldYardDto,
} from '@/modules/sub_field/dto/subfield.dto';

const subfieldRouter = Router();
const subfieldRepository = new PrismaSubFieldRepository(prisma);
const subfieldService = new SubFieldService(subfieldRepository);
const subfieldController = new SubFieldController(subfieldService);

subfieldRouter.post(
  '/',
  authenticate,
  authorize(UserRole.OWNER),
  validateDto(CreateFieldYardDto),
  subfieldController.createSubfield.bind(subfieldController),
);

subfieldRouter.put(
  '/:id',
  authenticate,
  authorize(UserRole.OWNER),
  validateDto(UpdateFieldYardDto),
  subfieldController.updateSubfield.bind(subfieldController),
);

subfieldRouter.delete(
  '/:id',
  authenticate,
  authorize(UserRole.OWNER),
  subfieldController.deleteSubfield.bind(subfieldController),
);

subfieldRouter.get(
  '/find/:id',
  subfieldController.getSubfield.bind(subfieldController),
);

subfieldRouter.get(
  '/all',
  authenticate,
  authorize(UserRole.ADMIN),
  subfieldController.getSubfields.bind(subfieldController),
);

subfieldRouter.get(
  '/:field_id/subfields',
  subfieldController.getSubFieldsByFieldId.bind(subfieldController),
);

export default subfieldRouter;
