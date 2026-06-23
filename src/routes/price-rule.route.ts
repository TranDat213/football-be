import { Router } from 'express';
import { PrismaPriceRuleRepository } from '@/modules/price_rule/infrastructure/prisma-price-rule.repository';
import { PriceRuleService } from '@/modules/price_rule/application/price-rule.service';
import { PriceRuleController } from '@/modules/price_rule/application/price-rule.controller';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate.middleware';
import { authorize } from '@/middleware/authorize.middlerware';
import { UserRole } from '@prisma/client';
import { validateDto } from '@/middleware/validate-dto.middleware';
import { CreateFieldPriceRuleDto, UpdateFieldPriceRuleDto } from '@/modules/price_rule/dto/price-rule.dto';

const priceRuleRouter = Router();
const priceRuleRepository = new PrismaPriceRuleRepository(prisma);
const priceRuleService = new PriceRuleService(priceRuleRepository);
const priceRuleController = new PriceRuleController(priceRuleService);

priceRuleRouter.get(
  '/:id',
  priceRuleController.getById.bind(priceRuleController),
);

priceRuleRouter.patch(
  '/:id',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ADMIN),
  validateDto(UpdateFieldPriceRuleDto),
  priceRuleController.update.bind(priceRuleController),
);

priceRuleRouter.delete(
  '/:id',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ADMIN),
  priceRuleController.delete.bind(priceRuleController),
);

export { priceRuleRouter, priceRuleController };
