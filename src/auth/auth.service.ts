import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import axios from "axios";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private jwtService: JwtService,
    ) {}

    generateAccessToken(user: { id: string; email: string; name?: string; avatar?: string }): string {
        const payload = { id: user.id, email: user.email, name: user.name, avatar: user.avatar };
        return this.jwtService.sign(payload, { expiresIn: "15m" });
    }

    generateRefreshToken(user: { id: string; email: string }): string {
        const payload = { id: user.id, email: user.email };
        return this.jwtService.sign(payload, { expiresIn: "7d" });
    }

    verifyToken(token: string): { id: string; email: string; name?: string; avatar?: string } | null {
        try {
            return this.jwtService.verify<{ id: string; email: string; name?: string; avatar?: string }>(token);
        } catch (error) {
            console.error("Error verifying token:", error.message);
            return null;
        }
    }

    verifyRefreshToken(token: string): { email: string } | null {
        try {
            return this.jwtService.verify<{ email: string }>(token);
        } catch (error) {
            throw new UnauthorizedException("Invalid refresh token");
        }
    }

    clearCookie(res: any): void {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
    }

    setCookie(res: any, name: string, value: string, maxAge: number): void {
        res.cookie(name, value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge,
        });
    }

    async handleGoogleCallback(code: string): Promise<{ id: string; email: string; name?: string; avatar?: string }> {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = "http://localhost:4000/auth/google/callback";

        const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        });

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const email = userResponse.data.email;
        const name = userResponse.data.name;
        const avatar = userResponse.data.picture;

        const user = await this.usersService.findOrCreateUser(email, name, avatar);

        return { id: user.id, email: user.email, name: user.name, avatar: user.avatar };
    }

    async getUserByEmail(email: string): Promise<{ id: string; email: string; name?: string; avatar?: string } | null> {
        const user = await this.usersService.findUserByEmail(email);
        if (!user) return null;

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
        };
    }
}
