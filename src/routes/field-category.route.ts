import { Router } from 'express';

import {
  CategoryDto,
  UpdateCategoryDto,
} from '@/modules/field_category/dto/category.dto';
import { CategoryController } from '@/modules/field_category/application/category.controller';
import { validateDto } from '@/middleware/validate-dto.middleware';

import { authorize } from '@/middleware/authorize.middlerware';
import { UserRole } from '@prisma/client';
import { asyncHandler } from '@/middleware/async-handler.middleware';
import { PrismaCategoryRepository } from '@/modules/field_category/infrastructure/prisma-category.repository';
import { CategoryService } from '@/modules/field_category/application/category.service';
import prisma from '@/lib/prisma';
import { authenticate } from '@/middleware/authenticate.middleware';

const categoryRouter = Router();
const categoryRepository = new PrismaCategoryRepository(prisma);
const categoryService = new CategoryService(categoryRepository);
const categoryController = new CategoryController(categoryService);

categoryRouter.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validateDto(CategoryDto),
  asyncHandler(categoryController.create.bind(categoryController)),
);
categoryRouter.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateDto(UpdateCategoryDto),
  asyncHandler(categoryController.update.bind(categoryController)),
);
categoryRouter.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(categoryController.delete.bind(categoryController)),
);
categoryRouter.get(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(categoryController.findById.bind(categoryController)),
);
categoryRouter.get(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(categoryController.findAll.bind(categoryController)),
);

export default categoryRouter;
