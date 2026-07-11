import prisma from '@/lib/prisma';
import { asyncHandler } from '@/middleware/async-handler.middleware';
import { authenticate } from '@/middleware/authenticate.middleware';
import { authorize } from '@/middleware/authorize.middlerware';
import { upload } from '@/middleware/upload';
import { validateDto } from '@/middleware/validate-dto.middleware';
import { FieldController } from '@/modules/field/application/field.controller';
import { FieldService } from '@/modules/field/application/field.service';
import { CreateFootballFieldUseCase } from '@/modules/field/application/create-football-field.usecase';
import { UpdateFootballFieldUseCase } from '@/modules/field/application/update-football-field.usecase';
import { DeleteFootballFieldUseCase } from '@/modules/field/application/delete-football-field.usecase';
import { UpdateFieldStatusDto } from '@/modules/field/dto/field.dto';
import { CreateFootballFieldCompleteDto } from '@/modules/field/dto/create-field-complete.dto';
import { UpdateFootballFieldCompleteDto } from '@/modules/field/dto/update-field-complete.dto';
import { PrismaFieldRepository } from '@/modules/field/infrastructure/prisma-field.repository';
import { PrismaSubFieldRepository } from '@/modules/sub_field/infrastructure/prisma-subfield.repository';
import { PrismaOperatingHourRepository } from '@/modules/operating_hour/infrastructure/prisma-operating-hour.repository';
import { PrismaPriceRuleRepository } from '@/modules/price_rule/infrastructure/prisma-price-rule.repository';
import { UserRole } from '@prisma/client';
import { Router } from 'express';

const fieldRouter = Router();
const fieldRepository = new PrismaFieldRepository(prisma);
const subFieldRepository = new PrismaSubFieldRepository(prisma);
const operatingHourRepository = new PrismaOperatingHourRepository(prisma);
const priceRuleRepository = new PrismaPriceRuleRepository(prisma);
const fieldService = new FieldService(fieldRepository);
const createFootballFieldUseCase = new CreateFootballFieldUseCase(
  prisma,
  fieldRepository,
  subFieldRepository,
  operatingHourRepository,
  priceRuleRepository,
  fieldService,
);
const updateFootballFieldUseCase = new UpdateFootballFieldUseCase(
  prisma,
  fieldRepository,
  subFieldRepository,
  operatingHourRepository,
  priceRuleRepository,
  fieldService,
);
const deleteFootballFieldUseCase = new DeleteFootballFieldUseCase(
  prisma,
  fieldRepository,
);
const fieldController = new FieldController(
  fieldService,
  createFootballFieldUseCase,
  updateFootballFieldUseCase,
  deleteFootballFieldUseCase,
);

// ── Legacy simple update (kept for backward-compat) ──────────────────────────

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

fieldRouter.get(
  '/:id/availability',
  asyncHandler(fieldController.getAvailability.bind(fieldController)),
);
fieldRouter.get(
  '/active',
  asyncHandler(fieldController.findFieldActiveStatus.bind(fieldController)),
);

fieldRouter.get(
  '/pending',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(fieldController.findFieldPendingStatus.bind(fieldController)),
);

fieldRouter.get(
  '/statics',
  asyncHandler(fieldController.getFieldStatics.bind(fieldController)),
);

fieldRouter.get(
  '/image/:id',
  asyncHandler(fieldController.findFieldImageById.bind(fieldController)),
);
fieldRouter.get(
  '/image/field/:id',
  asyncHandler(fieldController.findFieldImagesByFieldId.bind(fieldController)),
);

fieldRouter.post(
  '/upload',
  authenticate,
  authorize(UserRole.OWNER),
  upload.single('image'),
  asyncHandler(fieldController.upload.bind(fieldController)),
);

// ── Aggregate endpoint ────────────────────────────────────────────
fieldRouter.post(
  '/create-complete',
  authenticate,
  authorize(UserRole.OWNER),
  validateDto(CreateFootballFieldCompleteDto),
  asyncHandler(fieldController.createFieldComplete.bind(fieldController)),
);

fieldRouter.put(
  '/update-complete/:id',
  authenticate,
  authorize(UserRole.OWNER),
  validateDto(UpdateFootballFieldCompleteDto),
  asyncHandler(fieldController.updateFieldComplete.bind(fieldController)),
);

fieldRouter.patch(
  '/delete-complete/:id',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ADMIN),
  asyncHandler(fieldController.deleteFieldComplete.bind(fieldController)),
);

export default fieldRouter;
