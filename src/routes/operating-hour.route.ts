import { Router } from 'express';
import { PrismaOperatingHourRepository } from '@/modules/operating_hour/infrastructure/prisma-operating-hour.repository';
import { OperatingHourService } from '@/modules/operating_hour/application/operating-hour.service';
import { OperatingHourController } from '@/modules/operating_hour/application/operating-hour.controller';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate.middleware';
import { authorize } from '@/middleware/authorize.middlerware';
import { UserRole } from '@prisma/client';
import { validateDto } from '@/middleware/validate-dto.middleware';
import { CreateFieldOperatingHourDto, UpdateFieldOperatingHourDto } from '@/modules/operating_hour/dto/operating-hour.dto';

const operatingHourRouter = Router();
const operatingHourRepository = new PrismaOperatingHourRepository(prisma);
const operatingHourService = new OperatingHourService(operatingHourRepository);
const operatingHourController = new OperatingHourController(operatingHourService);

operatingHourRouter.post(
  '/:yardId',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ADMIN),
  validateDto(CreateFieldOperatingHourDto),
  operatingHourController.create.bind(operatingHourController),
)

operatingHourRouter.get(
  '/:id',
  operatingHourController.getById.bind(operatingHourController),
);

operatingHourRouter.patch(
  '/:id',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ADMIN),
  validateDto(UpdateFieldOperatingHourDto),
  operatingHourController.update.bind(operatingHourController),
);

operatingHourRouter.delete(
  '/:id',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ADMIN),
  operatingHourController.delete.bind(operatingHourController),
);

export { operatingHourRouter, operatingHourController };
