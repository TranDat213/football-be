import prisma from '@/lib/prisma';
import { AuthController } from '@/modules/auth/application/auth.controller';
import { AuthService } from '@/modules/auth/application/auth.service';
import { PrismaAuthRepository } from '@/modules/auth/infrastructure/prisma-auth.repository';
import { Router } from 'express';

const authRouter = Router();
const authRepository = new PrismaAuthRepository(prisma);
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

authRouter.post('/sign-in', authController.signIn.bind(authController));
authRouter.post('/sign-up', authController.signUp.bind(authController));
authRouter.post('/logout', authController.logout.bind(authController));
authRouter.patch(
  '/forgot-password',
  authController.forgot.bind(authController),
);
authRouter.post('/oauth', authController.OAuthUser.bind(authController));
export default authRouter;
