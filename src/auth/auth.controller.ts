import { Controller, Get, Query, Res, HttpException, HttpStatus } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Response } from "express";

@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get("google/callback")
    async googleCallback(@Query("code") code: string, @Res() res: Response): Promise<void> {
        console.log("Google callback received with code:", code);
        if (!code) {
            throw new HttpException("Authorization code is missing", HttpStatus.BAD_REQUEST);
        }

        try {
            const user = await this.authService.handleGoogleCallback(code);

            const accessToken = this.authService.generateAccessToken({
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
            });

            const refreshToken = this.authService.generateRefreshToken({
                id: user.id,
                email: user.email,
            });

            res.cookie("accessToken", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 15 * 60 * 1000,
            });

            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.redirect("http://localhost:5173");
        } catch (error) {
            throw new HttpException("Failed to authenticate with Google", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
