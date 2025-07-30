import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtGuard {
    constructor(private readonly jwtService: JwtService) {}

    canActivate(context: ExecutionContext): boolean {
        const ctx = GqlExecutionContext.create(context);
        const req = ctx.getContext().req;
        const token = req.cookies?.accessToken;

        if (!token) {
            throw new UnauthorizedException("No token");
        }

        try {
            const payload = this.jwtService.verify(token);
            req.user = payload;
            return true;
        } catch (e) {
            throw new UnauthorizedException("Invalid or expired token");
        }
    }
}
