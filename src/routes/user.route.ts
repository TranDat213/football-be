import { Router } from 'express';
import { asyncHandler } from '@/middleware/async-handler.middleware';
import { authenticate } from '@/middleware/authenticate.middleware';
import { validateDto } from '@/middleware/validate-dto.middleware';
import { AddOwnerDto, OwnerRegisterDto, UpdateOwnerRegisterStatusDto, UpdateProfileDto, UpdateRoleDto, UpdateUserStatusDto } from '@/modules/user/dto/user.dto';
import { UserController } from '@/modules/user/application/user.controller';
import { UserService } from '@/modules/user/application/user.service';
import { PrismaUserRepository } from '@/modules/user/infrastructure/prisma-user.repository';
import prisma from '@/lib/prisma';
import { upload } from '@/middleware/upload';
import { UserRole } from '@prisma/client';
import { authorize } from '@/middleware/authorize.middlerware';

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

userRouter.patch(
  '/update-status/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateDto(UpdateUserStatusDto),
  asyncHandler(userController.updateStatus.bind(userController)),
);

userRouter.post(
  '/owner-register',
  validateDto(OwnerRegisterDto),
  asyncHandler(userController.createOwnerRegister.bind(userController)),
);

userRouter.get(
  '/owner-register-pending',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(userController.getOwnerRegisterPending.bind(userController)),
);

userRouter.get(
  '/owner-register-pending-count',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(userController.countOwnerRegisterPending.bind(userController)),
);

userRouter.patch(
  '/owner-register-status/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateDto(UpdateOwnerRegisterStatusDto),
  asyncHandler(userController.updateOwnerRegisterStatus.bind(userController)),
);

userRouter.get(
  '/owner-register/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(userController.getOwnerRegisterById.bind(userController)),
);

userRouter.get(
  '/all-users',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(userController.getAllUsers.bind(userController)),
);

userRouter.get(
  '/all-owners',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(userController.getAllOwners.bind(userController)),
);

userRouter.get(
  '/all-accounts',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(userController.getAllAccounts.bind(userController)),
);

userRouter.get(
  '/statistics',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(userController.getAccountStatistics.bind(userController)),
);


userRouter.get(
  '/:id',
  authenticate,
  asyncHandler(userController.getUserById.bind(userController)),
);
export default userRouter;
