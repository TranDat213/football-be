import { getEnv } from "../utils/get-env";

export const Env = {
    PORT: parseInt(getEnv('PORT', '5000')),
    JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '7d'),
    JWT_REFRESH_EXPIRES_IN: getEnv('JWT_REFRESH_EXPIRES_IN', '30d'),
    JWT_SECRET: getEnv('JWT_SECRET'),
    JWT_REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET'),
    NODE_ENV: getEnv('NODE_ENV', 'development'),
    COOKIE_MAX_AGE: getEnv('COOKIE_MAX_AGE', '7d'),
    COOKIE_REFRESH_MAX_AGE: getEnv('COOKIE_REFRESH_MAX_AGE', '30d'),
    MAX_SLUG_LENGTH: parseInt(getEnv('MAX_SLUG_LENGTH')),

    CLOUDINARY_CLOUD_NAME: getEnv('CLOUDINARY_CLOUD_NAME'),
    CLOUDINARY_API_KEY: getEnv('CLOUDINARY_API_KEY'),
    CLOUDINARY_API_SECRET: getEnv('CLOUDINARY_API_SECRET'),
    CLOUDINARY_URL: getEnv('CLOUDINARY_URL'),

    RESEND_API_KEY: getEnv('RESEND_API_KEY'),
    RESEND_FROM: getEnv('RESEND_FROM'),

    OTP_EXPIRES: getEnv('OTP_EXPIRES', '60000'),
    OTP_COOLDOWN: getEnv('OTP_COOLDOWN', '60000'),
} as const;