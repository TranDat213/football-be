import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '@/utils/app-error';

export const validateDto = (dtoClass: any, type: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    console.log('dtoClass:', dtoClass);
    console.log('req.body:', req.body);
    const dto = plainToInstance(dtoClass, req[type]);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = errors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .join('; ');
      throw new BadRequestException(messages);
    }

    Object.assign(req[type], dto);
    next();
  };
};
