import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Env } from '@/config/env.config';
import { UnauthorizedException } from '@/utils/app-error';
import { PrismaAuthRepository } from '@/modules/auth/infrastructure/prisma-auth.repository';
import prisma from '@/lib/prisma';

const authRepository = new PrismaAuthRepository(prisma);

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new UnauthorizedException('Authentication token missing'));
    }

    const decoded = jwt.verify(token, Env.JWT_SECRET) as { userId: string };
    const user = await authRepository.findUserById(decoded.userId);

    if (!user) {
      return next(new UnauthorizedException('User not found'));
    }

    req.user = {
      id: user.id.toString(),
      email: user.email!,
      role: user.role,
    };

    next();
  } catch (error) {
    return next(new UnauthorizedException('Invalid or expired token'));
  }
};
