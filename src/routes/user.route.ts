import { Router } from 'express';
import { asyncHandler } from '@/middleware/async-handler.middleware';
import { authenticate } from '@/middleware/authenticate.middleware';
import { validateDto } from '@/middleware/validate-dto.middleware';
import { UpdateProfileDto } from '@/modules/user/dto/user.dto';
import { UserController } from '@/modules/user/application/user.controller';
import { UserService } from '@/modules/user/application/user.service';
import { PrismaUserRepository } from '@/modules/user/infrastructure/prisma-user.repository';
import prisma from '@/lib/prisma';
import { upload } from '@/middleware/upload';

const userRouter = Router();
const userRepository = new PrismaUserRepository(prisma);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

userRouter.get(
  '/profile',
  authenticate,
  asyncHandler(userController.getProfileById.bind(userController)),
);
userRouter.put(
  '/profile',
  authenticate,
  upload.single('avatar'),
  validateDto(UpdateProfileDto),
  asyncHandler(userController.updateProfile.bind(userController)),
);

export default userRouter;
