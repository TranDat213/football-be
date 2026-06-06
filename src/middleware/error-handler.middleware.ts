import { HTTPSTATUS } from '@/config/http.config';
import { AppError, ErrorCodes } from '@/utils/app-error';
import { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error, req, res, next): any => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      errorCode: error.errorCode,
    });
  }

  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: 'Internal Server Error',
    error: error?.message || 'An unexpected error occurred',
    errorCode: ErrorCodes.ERROR_INTERNAL,
  });
};
