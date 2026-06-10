import prisma from '@/lib/prisma';
import { asyncHandler } from '@/middleware/async-handler.middleware';
import { authenticate } from '@/middleware/authenticate.middleware';
import { authorize } from '@/middleware/authorize.middlerware';
import { validateDto } from '@/middleware/validate-dto.middleware';
import { AuthController } from '@/modules/auth/application/auth.controller';
import { AuthService } from '@/modules/auth/application/auth.service';
import {
  AddOwnerDto,
  ForgotPasswordDto,
  OwnerRegisterDto,
  SignInDto,
  SignUpDto,
  UpdateRoleDto,
} from '@/modules/auth/dto/auth.dto';
import { PrismaAuthRepository } from '@/modules/auth/infrastructure/prisma-auth.repository';
import { UserRole } from '@prisma/client';
import { Router } from 'express';

const authRouter = Router();
const authRepository = new PrismaAuthRepository(prisma);
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

authRouter.post(
  '/sign-in',
  validateDto(SignInDto),
  asyncHandler(authController.signIn.bind(authController)),
);

authRouter.post(
  '/sign-up',
  validateDto(SignUpDto),
  asyncHandler(authController.signUp.bind(authController)),
);

authRouter.post('/logout', authController.logout.bind(authController));

authRouter.patch(
  '/forgot-password',
  validateDto(ForgotPasswordDto),
  asyncHandler(authController.forgot.bind(authController)),
);

authRouter.post(
  '/owner-register',
  validateDto(OwnerRegisterDto),
  asyncHandler(authController.createOwnerRegister.bind(authController)),
);

authRouter.post(
  '/oauth',
  validateDto(OwnerRegisterDto),
  asyncHandler(authController.OAuthUser.bind(authController)),
);

authRouter.post(
  '/create-owner',
  authenticate,
  authorize(UserRole.ADMIN),
  validateDto(AddOwnerDto),
  asyncHandler(authController.createOwner.bind(authController)),
);

authRouter.patch(
  '/update-role/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateDto(UpdateRoleDto),
  asyncHandler(authController.updateRole.bind(authController)),
);
export default authRouter;
