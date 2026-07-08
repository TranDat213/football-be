import { Router } from 'express';

import prisma from '@/lib/prisma';
import { FootballFieldUpdateRequestService } from '@/modules/footballfield_update/application/update-request.service';
import { FootballFieldUpdateRequestController } from '@/modules/footballfield_update/application/update-request.controller';
import { PrismaFootballFieldUpdateRequestRepository } from '@/modules/footballfield_update/interface/prisma-update-request.repository';
import { PrismaFieldRepository } from '@/modules/field/infrastructure/prisma-field.repository';
import { PrismaCategoryRepository } from '@/modules/field_category/infrastructure/prisma-category.repository';
import { UpdateFootballFieldUseCase } from '@/modules/field/application/update-football-field.usecase';
import { authenticate } from '@/middleware/authenticate.middleware';
import { authorize } from '@/middleware/authorize.middlerware';
import { validateDto } from '@/middleware/validate-dto.middleware';
import { RejectFootballFieldUpdateRequestDto } from '@/modules/footballfield_update/dto/update-request.dto';
import { PrismaSubFieldRepository } from '@/modules/sub_field/infrastructure/prisma-subfield.repository';
import { PrismaOperatingHourRepository } from '@/modules/operating_hour/infrastructure/prisma-operating-hour.repository';
import { PrismaPriceRuleRepository } from '@/modules/price_rule/infrastructure/prisma-price-rule.repository';
import { FieldService } from '@/modules/field/application/field.service';

// TODO: import repo thật của field/category đang có sẵn trong project
// import { FieldPrismaRepository } from '@/modules/field/infrastructure/field.prisma.repository';
// import { CategoryPrismaRepository } from '@/modules/category/infrastructure/category.prisma.repository';
const fieldUpdateRouter = Router();

// DI Setup
const requestRepo = new PrismaFootballFieldUpdateRequestRepository(prisma);
const fieldRepo = new PrismaFieldRepository(prisma);
const categoryRepo = new PrismaCategoryRepository(prisma);
const subFieldRepository = new PrismaSubFieldRepository(prisma);
const operatingHourRepository = new PrismaOperatingHourRepository(prisma);
const priceRuleRepository = new PrismaPriceRuleRepository(prisma);
const fieldService = new FieldService(fieldRepo);
const updateFieldUseCase = new UpdateFootballFieldUseCase(
  prisma,
  fieldRepo,
  subFieldRepository,
  operatingHourRepository,
  priceRuleRepository,
  fieldService,
);
const service = new FootballFieldUpdateRequestService(requestRepo, fieldRepo, categoryRepo, updateFieldUseCase);
const controller = new FootballFieldUpdateRequestController(service);

fieldUpdateRouter.post(
  '/football-fields/:id/update-request',
  authenticate,
  authorize('OWNER'),
  controller.createRequest.bind(controller),
);

fieldUpdateRouter.patch(
  '/admin/football-field-update-request/:id/approve',
  authenticate,
  authorize('ADMIN'),
  controller.approveRequest.bind(controller),
);

fieldUpdateRouter.patch(
  '/admin/football-field-update-request/:id/reject',
  authenticate,
  authorize('ADMIN'),
  validateDto(RejectFootballFieldUpdateRequestDto),
  controller.rejectRequest.bind(controller),
);

fieldUpdateRouter.get(
  '/admin/football-field-update-request',
  authenticate,
  authorize('ADMIN'),
  controller.listRequests.bind(controller),
);

export default fieldUpdateRouter;