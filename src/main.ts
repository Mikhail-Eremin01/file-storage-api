import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { graphqlUploadExpress } from "graphql-upload";
import * as cookieParser from "cookie-parser";
import * as dotenv from "dotenv";

dotenv.config();

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.use(cookieParser());
    app.use(graphqlUploadExpress({ maxFileSize: 1000000, maxFiles: 5 }));

    app.enableCors({
        origin: "http://localhost:5174",
        credentials: true,
    });

    await app.listen(process.env.PORT || 4000);
    console.log(`Application is running on: ${process.env.PORT || 4000} PORT`);
}
bootstrap();
