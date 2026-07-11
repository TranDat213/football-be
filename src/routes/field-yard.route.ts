import { Router } from 'express';
import { operatingHourController } from './operating-hour.route';
import { priceRuleController } from './price-rule.route';

const fieldYardRouter = Router();

fieldYardRouter.get(
  '/:yardId/operating-hours',
  operatingHourController.getByYardId.bind(operatingHourController),
);

fieldYardRouter.get(
  '/:yardId/price-rules',
  priceRuleController.getByYardId.bind(priceRuleController),
);

export default fieldYardRouter;
