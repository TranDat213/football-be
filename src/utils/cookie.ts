import { Env } from "@/config/env.config";
import { Response } from "express";
import jwt from 'jsonwebtoken';
import ms from 'ms';

type Time = `${number} ${'s' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y'}`
type Duration = `${number} ${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

type Cookie = {
    res: Response;
    userId: string;
};

const createAccessToken = (userId: string) => {
    return jwt.sign(
        { userId },
        Env.JWT_SECRET,
        {
            audience: ['user'],
            expiresIn: Env.JWT_EXPIRES_IN as Time,
        }
    )
}

const createRefreshToken = (userId: string) => {
    return jwt.sign(
        { userId },
        Env.JWT_REFRESH_SECRET,
        {
            audience: ['user'],
            expiresIn: Env.JWT_REFRESH_EXPIRES_IN as Time,
        }
    )
}
export const setJwtAuthCookie = ({ res, userId }: Cookie) => {
    const accessToken = createAccessToken(userId);
    const refreshToken = createRefreshToken(userId);
    
    const isProduction = Env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
        maxAge: ms(Env.COOKIE_MAX_AGE as Duration),
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
        maxAge: ms(Env.COOKIE_REFRESH_MAX_AGE as Duration),
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
    });

    return {
        accessToken,
        refreshToken,
    };
}
export const clearAuthCookie = (res: Response) => {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    return res;
}