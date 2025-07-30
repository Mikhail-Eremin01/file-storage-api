import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { join } from "path";
import { ConfigModule } from "@nestjs/config";
import { AppResolver } from "./app.resolver";
import { GraphQLUpload } from "graphql-upload";
import { AuthModule } from "./auth/auth.module";
import { MongooseModule } from "@nestjs/mongoose";
import { FoldersModule } from "./folders/folders.module";
import { FilesModule } from "./files/files.module";
import { UsersModule } from "./users/users.module";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            autoSchemaFile: join(process.cwd(), "src/schema.gql"),
            playground: true,
            resolvers: { Upload: GraphQLUpload },
            csrfPrevention: false,
            context: ({ req, res }) => ({ req, res }),
        }),
        AuthModule,
        MongooseModule.forRoot(
            (() => {
                if (!process.env.MONGO_URI) {
                    throw new Error("MONGO_URI is not defined in environment variables");
                }
                return process.env.MONGO_URI;
            })(),
        ),
        FoldersModule,
        FilesModule,
        UsersModule,
    ],
    providers: [AppResolver],
})
export class AppModule {}
