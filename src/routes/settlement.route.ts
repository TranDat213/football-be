import { Router } from 'express';
import { SettlementController } from '../modules/settlement/application/settlement.controller';
import { SettlementService } from '../modules/settlement/application/settlement.service';
import { PrismaSettlementRepository } from '../modules/settlement/infrastructure/prisma-settlement.repository';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/authenticate.middleware';
import { authorize } from '../middleware/authorize.middlerware';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { UserRole } from '@prisma/client';

const settlementRouter = Router();

const settlementRepository = new PrismaSettlementRepository(prisma);
const settlementService = new SettlementService(settlementRepository);
const settlementController = new SettlementController(settlementService);

// Commission (Admin only)
settlementRouter.get(
  '/commissions',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(settlementController.getCommissions.bind(settlementController))
);

export default settlementRouter;
