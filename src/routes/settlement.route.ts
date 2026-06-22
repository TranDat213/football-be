import { Router } from 'express';
import { SettlementController } from '../modules/settlement/application/settlement.controller';
import { SettlementService } from '../modules/settlement/application/settlement.service';
import { PrismaSettlementRepository } from '../modules/settlement/infrastructure/prisma-settlement.repository';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/authenticate.middleware';
import { authorize } from '../middleware/authorize.middlerware';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { validateDto } from '../middleware/validate-dto.middleware';
import { UserRole } from '@prisma/client';
import { RequestPayoutDto, UpdatePayoutStatusDto } from '../modules/settlement/dto/settlement.dto';

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

// Payout (Owner & Admin)
settlementRouter.post(
  '/payouts',
  authenticate,
  authorize(UserRole.OWNER),
  validateDto(RequestPayoutDto),
  asyncHandler(settlementController.requestPayout.bind(settlementController))
);

settlementRouter.get(
  '/payouts/my',
  authenticate,
  authorize(UserRole.OWNER),
  asyncHandler(settlementController.getMyPayouts.bind(settlementController))
);

settlementRouter.patch(
  '/payouts/:id/status',
  authenticate,
  authorize(UserRole.ADMIN),
  validateDto(UpdatePayoutStatusDto),
  asyncHandler(settlementController.updatePayoutStatus.bind(settlementController))
);

export default settlementRouter;
