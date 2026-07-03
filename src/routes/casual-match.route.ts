import { Router } from 'express';
import { CasualMatchController } from '../modules/casual-match/application/casual-match.controller';
import { CasualMatchService } from '../modules/casual-match/application/casual-match.service';
import { PrismaCasualMatchRepository } from '../modules/casual-match/infrastructure/prisma-casual-match.repository';
import { VNPayService } from '../modules/payment/application/vnpay.service';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/authenticate.middleware';
import { authorize } from '../middleware/authorize.middlerware';
import { asyncHandler } from '../middleware/async-handler.middleware';
import { validateDto } from '../middleware/validate-dto.middleware';
import { UserRole } from '@prisma/client';
import {
  CreateCasualMatchDto,
  UpdateCasualMatchDto,
  JoinCasualMatchDto,
  CancelParticipationDto,
  UpdateMatchStatusDto,
} from '../modules/casual-match/dto/casual-match.dto';

const casualMatchRouter = Router();

// ─── DI ───────────────────────────────────────────────────────────────────────
const repo = new PrismaCasualMatchRepository(prisma);
const vnpayService = new VNPayService();
const service = new CasualMatchService(repo, prisma, vnpayService);
const ctrl = new CasualMatchController(service);

// ─── Public IPN (must be BEFORE authenticate to stay public) ─────────────────
/**
 * POST /casual-matches/payment/ipn
 * VNPay server-to-server callback — public.
 * NOTE: Registered before /:id routes to avoid Express matching "payment" as :id.
 */
casualMatchRouter.post(
  '/payment/ipn',
  asyncHandler(ctrl.handleIPN.bind(ctrl)),
);

// ─── Authenticated routes ─────────────────────────────────────────────────────

/**
 * POST /casual-matches
 * Create a casual match from an existing confirmed booking.
 */
casualMatchRouter.post(
  '/',
  authenticate,
  authorize(UserRole.USER, UserRole.OWNER),
  validateDto(CreateCasualMatchDto),
  asyncHandler(ctrl.create.bind(ctrl)),
);

/**
 * GET /casual-matches
 * Browse open public matches. Public — no auth required.
 * Query: province, district, footballFieldId, bookingDate, skillLevel, keyword, page, limit
 */
casualMatchRouter.get(
  '/',
  asyncHandler(ctrl.browse.bind(ctrl)),
);

/**
 * GET /casual-matches/owner
 * Host's own matches (authenticated).
 * Must be defined before /:id to avoid conflict.
 */
casualMatchRouter.get(
  '/owner',
  authenticate,
  authorize(UserRole.OWNER),
  asyncHandler(ctrl.getOwnerMatches.bind(ctrl)),
)

casualMatchRouter.get(
  '/host',
  authenticate,
  asyncHandler(ctrl.getByHostId.bind(ctrl)),
);

/**
 * GET /casual-matches/:id
 * Detail view — public.
 */
casualMatchRouter.get(
  '/:id',
  authenticate,
  asyncHandler(ctrl.getById.bind(ctrl)),
);

/**
 * PATCH /casual-matches/:id
 * Host-only field update (title, description, slotPrice, etc.)
 */
casualMatchRouter.patch(
  '/:id',
  authenticate,
  validateDto(UpdateCasualMatchDto),
  asyncHandler(ctrl.update.bind(ctrl)),
);

/**
 * DELETE /casual-matches/:id
 * Soft delete — owner only, no participants, not started.
 */
casualMatchRouter.delete(
  '/:id',
  authenticate,
  asyncHandler(ctrl.remove.bind(ctrl)),
);

/**
 * POST /casual-matches/:id/join
 * Reserve slot(s) in a casual match.
 */
casualMatchRouter.post(
  '/:id/join',
  authenticate,
  authorize(UserRole.USER, UserRole.OWNER),
  validateDto(JoinCasualMatchDto),
  asyncHandler(ctrl.join.bind(ctrl)),
);

/**
 * POST /casual-matches/:id/payment
 * Generate VNPay URL for participant fee.
 */
casualMatchRouter.post(
  '/:id/payment',
  authenticate,
  asyncHandler(ctrl.initPayment.bind(ctrl)),
);

/**
 * POST /casual-matches/:id/cancel
 * Participant cancels own reservation.
 */
casualMatchRouter.post(
  '/:id/cancel',
  authenticate,
  validateDto(CancelParticipationDto),
  asyncHandler(ctrl.cancelParticipation.bind(ctrl)),
);

/**
 * PATCH /casual-matches/:id/status
 * Owner or Admin changes match status.
 */
casualMatchRouter.patch(
  '/:id/status',
  authenticate,
  authorize(UserRole.USER, UserRole.OWNER, UserRole.ADMIN),
  validateDto(UpdateMatchStatusDto),
  asyncHandler(ctrl.updateStatus.bind(ctrl)),
);

export default casualMatchRouter;
