import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { authorize } from '@/middleware/authorize.middlerware';
import { UserRole } from '@prisma/client';
import { validateDto } from '@/middleware/validate-dto.middleware';
import { operatingHourController } from './operating-hour.route';
import { priceRuleController } from './price-rule.route';
import { CreateFieldOperatingHourDto } from '@/modules/operating_hour/dto/operating-hour.dto';
import { CreateFieldPriceRuleDto } from '@/modules/price_rule/dto/price-rule.dto';

const fieldYardRouter = Router();

// Operating Hours
fieldYardRouter.post(
  '/:yardId/operating-hours',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ADMIN),
  validateDto(CreateFieldOperatingHourDto),
  operatingHourController.create.bind(operatingHourController),
);

fieldYardRouter.get(
  '/:yardId/operating-hours',
  operatingHourController.getByYardId.bind(operatingHourController),
);

// Price Rules
fieldYardRouter.post(
  '/:yardId/price-rules',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ADMIN),
  validateDto(CreateFieldPriceRuleDto),
  priceRuleController.create.bind(priceRuleController),
);

fieldYardRouter.get(
  '/:yardId/price-rules',
  priceRuleController.getByYardId.bind(priceRuleController),
);

export default fieldYardRouter;
