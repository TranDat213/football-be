import prisma from '@/lib/prisma';
import { asyncHandler } from '@/middleware/async-handler.middleware';
import { authenticate } from '@/middleware/authenticate.middleware';
import { authorize } from '@/middleware/authorize.middlerware';
import { validateDto } from '@/middleware/validate-dto.middleware';
import { FieldController } from '@/modules/field/application/field.controller';
import { FieldService } from '@/modules/field/application/field.service';
import {
  FieldDto,
  UpdateFieldDto,
  UpdateFieldStatusDto,
} from '@/modules/field/dto/field.dto';
import { PrismaFieldRepository } from '@/modules/field/infrastructure/prisma-field.repository';
import { UserRole } from '@prisma/client';
import { Router } from 'express';

const fieldRouter = Router();
const fieldRepository = new PrismaFieldRepository(prisma);
const fieldService = new FieldService(fieldRepository);
const fieldController = new FieldController(fieldService);

fieldRouter.post(
  '/create',
  authenticate,
  authorize(UserRole.OWNER),
  validateDto(FieldDto),
  asyncHandler(fieldController.createField.bind(fieldController)),
);
fieldRouter.put(
  '/:id',
  authenticate,
  authorize(UserRole.OWNER),
  validateDto(UpdateFieldDto),
  asyncHandler(fieldController.updateField.bind(fieldController)),
);
fieldRouter.delete(
  '/:id',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ADMIN),
  asyncHandler(fieldController.deleteField.bind(fieldController)),
);
fieldRouter.get(
  '/find/:id',
  asyncHandler(fieldController.findById.bind(fieldController)),
);
fieldRouter.patch(
  '/status/:id',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ADMIN),
  validateDto(UpdateFieldStatusDto),
  asyncHandler(fieldController.updateFieldStatus.bind(fieldController)),
);
fieldRouter.get(
  '/owner',
  authenticate,
  authorize(UserRole.OWNER),
  asyncHandler(fieldController.getFieldByOwnerId.bind(fieldController)),
);
export default fieldRouter;
