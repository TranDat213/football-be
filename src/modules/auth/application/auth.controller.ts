import { NextFunction, Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  OAuthDto,
  SignInDto,
  SignUpDto,
  VerifyOtpDto,
} from '../dto/auth.dto';
import { clearAuthCookie, setJwtAuthCookie } from '@/utils/cookie';
import { HTTPSTATUS } from '@/config/http.config';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async signIn(req: Request, res: Response, _next: NextFunction) {
    const dto = req.body as SignInDto;
    const user = await this.authService.signIn(dto);
    const userId = user?.id.toString();
    setJwtAuthCookie({
      res,
      userId: userId!,
    });
    return res.status(200).json({
      message: 'Login successfully',
      data: {
        user,
      },
    });
  }

  async signUp(req: Request, res: Response, _next: NextFunction) {
    const dto = req.body as SignUpDto;
    const user = await this.authService.signUp(dto);
    return res.status(201).json({
      message: 'Sign up successfully',
      data: {
        user,
      },
    });
  }

  async logout(_req: Request, res: Response) {
    return clearAuthCookie(res).status(HTTPSTATUS.OK).json({
      message: 'User logged out successfully',
    });
  }

  async forgot(req: Request, res: Response, _next: NextFunction) {
    const dto = req.body as ForgotPasswordDto;
    const user = await this.authService.forgotPassword(dto);
    return res.status(200).json({
      message: 'Forgot password successfully',
      data: {
        user,
      },
    });
  }
  async OAuthUser(req: Request, res: Response, _next: NextFunction) {
    const dto = req.body as OAuthDto;
    const user = await this.authService.signInByProvider(dto);
    const userId = user?.id.toString();
    setJwtAuthCookie({
      res,
      userId: userId!,
    });
    return res.status(200).json({
      message: 'OAuth user successfully',
      data: {
        user,
      },
    });
  }

  async refreshToken(req: Request, res: Response, _next: NextFunction) {
    const refreshTokenValue = req.cookies.refreshToken;
    if (!refreshTokenValue) {
      return res.status(401).json({ message: 'Refresh token missing' });
    }

    try {
      const decoded = await this.authService.verifyRefreshToken(refreshTokenValue);
      setJwtAuthCookie({
        res,
        userId: decoded.userId,
      });
      return res.status(200).json({
        message: 'Refresh token successfully',
      });
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
  }

  async requestOtp(req: Request, res: Response, _next: NextFunction) {
    const email = req.body.email as string;
    await this.authService.requestOtp(email);
    return res.status(200).json({
      message: 'OTP sent successfully',
    });
  }

  async verifyOtp(req: Request, res: Response, _next: NextFunction) {
    const dto = req.body as VerifyOtpDto;
    await this.authService.veriFyOtp(dto);
    return res.status(200).json({
      message: 'OTP verified successfully',
    });
  }
}
