import { Resolver, Query, Mutation, Context } from "@nestjs/graphql";
import { AuthService } from "./auth.service";
import { ObjectType, Field } from "@nestjs/graphql";
import { Request, Response } from "express";
import { JwtGuard } from "./jwt.guard";
import { UseGuards } from "@nestjs/common";

@ObjectType()
export class MeResponse {
    @Field(() => Boolean)
    authenticated: boolean;

    @Field(() => String, { nullable: true })
    id?: string;

    @Field(() => String, { nullable: true })
    email?: string;

    @Field(() => String, { nullable: true })
    name?: string;
}

@Resolver()
export class AuthResolver {
    constructor(private authService: AuthService) {}

    @Mutation(() => String)
    async googleAuth(@Context() context: any): Promise<string> {
        console.log("googleAuth called");
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = "https://file-storage-api-production-eb22.up.railway.app/auth/google/callback";
        const scope = "email profile";
        const responseType = "code";

        const googleOAuthUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}`;

        return googleOAuthUrl;
    }

    @Query(() => MeResponse)
    @UseGuards(JwtGuard)
    async me(@Context() context: any): Promise<MeResponse> {
        const token = context.req.cookies?.accessToken;

        if (!token) {
            return { authenticated: false };
        }

        const payload = this.authService.verifyToken(token);
        if (!payload) {
            return { authenticated: false };
        }

        return {
            authenticated: true,
            id: payload.id,
            email: payload.email,
            name: payload.name,
        };
    }

    @Mutation(() => Boolean)
    logout(@Context() context: any): boolean {
        context.res.clearCookie("accessToken", {
            httpOnly: true,
            sameSite: "strict",
        });
        context.res.clearCookie("refreshToken", {
            httpOnly: true,
            sameSite: "strict",
        });
        return true;
    }

    @Mutation(() => Boolean)
    async refresh(@Context() context: { req: Request; res: Response }): Promise<boolean> {
        const refreshToken = context.req.cookies?.refreshToken;
        if (!refreshToken) throw new Error("No refresh token");

        try {
            const payload = this.authService.verifyRefreshToken(refreshToken);
            if (!payload || !payload.email) {
                throw new Error("Invalid refresh token payload");
            }

            const user = await this.authService.getUserByEmail(payload.email);
            if (!user) {
                throw new Error("User not found");
            }

            const newAccessToken = this.authService.generateAccessToken({
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
            });

            const newRefreshToken = this.authService.generateRefreshToken({
                id: user.id,
                email: user.email,
            });

            context.res.cookie("accessToken", newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 15 * 60 * 1000,
            });

            context.res.cookie("refreshToken", newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            return true;
        } catch (e) {
            throw new Error("Invalid refresh token");
        }
    }
}
