import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FoldersService } from "./folders.service";
import { FoldersResolver } from "./folders.resolver";
import { Folder, FolderSchema } from "./folder.entity";
import { File, FileSchema } from "../files/file.entity";
import { FilesModule } from "src/files/files.module";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Folder.name, schema: FolderSchema },
            { name: File.name, schema: FileSchema },
        ]),
        FilesModule,
    ],
    providers: [FoldersService, FoldersResolver],
})
export class FoldersModule {}
