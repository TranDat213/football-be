import { NextFunction, Request, Response } from 'express';
import { ForbiddenException, UnauthorizedException } from '../utils/app-error';
import { UserRole } from '@prisma/client';

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(new UnauthorizedException('Unauthorized'));
    }

    if (!allowedRoles.includes(user.role)) {
      return next(new ForbiddenException("Forbidden: You don't have permission"));
    }

    next();
  };
};
