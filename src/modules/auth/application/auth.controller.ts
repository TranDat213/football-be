import { NextFunction, Request, Response } from "express";
import { AuthService } from "./auth.service";
import { SignInDto, SignUpDto } from "../dto/auth.dto";
import { clearAuthCookie, setJwtAuthCookie } from "@/utils/cookie";
import { HTTPSTATUS } from "@/config/http.config";

export class AuthController{
    constructor(private readonly authService: AuthService){}

    async signIn(req: Request, res: Response,_next:NextFunction){
        const dto = req.body as SignInDto;
        const user = await this.authService.signIn(dto);
        const userId =user?.id.toString();
        const {accessToken,refreshToken} = setJwtAuthCookie({res,userId:userId!});
        return res.status(200).json({
            message:"Login successfully",
            data:{
                
                accessToken,
                refreshToken,
                user,
            }
        })
    }

    async signUp(req: Request, res: Response,_next:NextFunction){
        const dto = req.body as SignUpDto;
        const user = await this.authService.signUp(dto);
        const userId =user?.id.toString();
        const {accessToken,refreshToken} = setJwtAuthCookie({res,userId:userId!});
        return res.status(200).json({
            message:"Sign up successfully",
            data:{
                accessToken,
                refreshToken,
                user,
            }
        })
    }
     async logout(req: Request, res: Response) {
    return clearAuthCookie(res).status(HTTPSTATUS.OK).json({
      message: 'User logged out successfully',
    });
  }
}