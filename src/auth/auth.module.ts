import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { AuthResolver } from "./auth.resolver";
import { AuthService } from "./auth.service";
import { GoogleStrategy } from "./google.strategy";
import { AuthController } from "./auth.controller";
import { UsersModule } from "../users/users.module";

@Module({
    imports: [
        PassportModule,
        JwtModule.register({
            secret: "your-secret-key",
            signOptions: { expiresIn: "1h" },
        }),
        UsersModule,
    ],
    controllers: [AuthController],
    providers: [GoogleStrategy, AuthResolver, AuthService],
})
export class AuthModule {}
