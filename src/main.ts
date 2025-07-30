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
        origin: "*",
        credentials: true,
    });

    await app.listen(process.env.PORT || 4000);
    console.log(`Application is running on: http://localhost:${process.env.PORT || 4000}/graphql`);
}
bootstrap();
