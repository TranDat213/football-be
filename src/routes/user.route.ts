import { Router } from 'express';
import { asyncHandler } from '@/middleware/async-handler.middleware';
import { authenticate } from '@/middleware/authenticate.middleware';
import { validateDto } from '@/middleware/validate-dto.middleware';
import { AddOwnerDto, OwnerRegisterDto, UpdateProfileDto, UpdateRoleDto } from '@/modules/user/dto/user.dto';
import { UserController } from '@/modules/user/application/user.controller';
import { UserService } from '@/modules/user/application/user.service';
import { PrismaUserRepository } from '@/modules/user/infrastructure/prisma-user.repository';
import prisma from '@/lib/prisma';
import { upload } from '@/middleware/upload';
import { authorize } from 'passport';
import { UserRole } from '@prisma/client';

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

userRouter.post(
  '/create-owner',
  authenticate,
  authorize(UserRole.ADMIN),
  validateDto(AddOwnerDto),
  asyncHandler(userController.createOwner.bind(userController)),
);

userRouter.patch(
  '/update-role/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateDto(UpdateRoleDto),
  asyncHandler(userController.updateRole.bind(userController)),
);

userRouter.post(
  '/owner-register',
  validateDto(OwnerRegisterDto),
  asyncHandler(userController.createOwnerRegister.bind(userController)),
);

export default userRouter;
