import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FilesResolver } from "./files.resolver";
import { FilesService } from "./files.service";
import { File, FileSchema } from "./file.entity";

@Module({
    imports: [MongooseModule.forFeature([{ name: File.name, schema: FileSchema }])],
    providers: [FilesResolver, FilesService],
    exports: [FilesService],
})
export class FilesModule {}
