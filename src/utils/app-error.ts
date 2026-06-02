import { HTTPSTATUS, HTTPStatusCodeType } from "../config/http.config";


export const ErrorCodes = {
  ERROR_INTERNAL: 'ERROR_INTERNAL',
  ERROR_NOT_FOUND: 'ERROR_NOT_FOUND',
  ERROR_UNAUTHORIZED: 'ERROR_UNAUTHORIZED',
  ERROR_FORBIDDEN: 'ERROR_FORBIDDEN',
  ERROR_BAD_REQUEST: 'ERROR_BAD_REQUEST',
} as const;

export type ErrorCodeType = keyof typeof ErrorCodes;

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: HTTPStatusCodeType = HTTPSTATUS.INTERNAL_SERVER_ERROR,
    public errorCode: ErrorCodeType = ErrorCodes.ERROR_INTERNAL,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

export class InternalServerException extends AppError {
  constructor(message: string = 'Internal Server Error') {
    super(message, HTTPSTATUS.INTERNAL_SERVER_ERROR, ErrorCodes.ERROR_INTERNAL);
  }
}

export class NotFoundException extends AppError {
  constructor(message = 'Resource Not Found') {
    super(message, HTTPSTATUS.NOT_FOUND, ErrorCodes.ERROR_NOT_FOUND);
  }
}
export class BadRequestException extends AppError {
  constructor(message = 'Bad Request') {
    super(message, HTTPSTATUS.BAD_REQUEST, ErrorCodes.ERROR_BAD_REQUEST);
  }
}
export class UnauthorizedException extends AppError {
  constructor(message = 'Unauthorized Access') {
    super(message, HTTPSTATUS.UNAUTHORIZED, ErrorCodes.ERROR_UNAUTHORIZED);
  }
}
