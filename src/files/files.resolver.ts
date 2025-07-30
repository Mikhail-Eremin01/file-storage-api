import { Resolver, Mutation, Args } from "@nestjs/graphql";
import { GraphQLUpload } from "graphql-upload";
import { FilesService } from "./files.service";
import { File } from "./file.entity";

@Resolver(() => File)
export class FilesResolver {
    constructor(private readonly filesService: FilesService) {}

    @Mutation(() => File)
    async uploadFile(
        @Args({ name: "file", type: () => GraphQLUpload }) file: any,
        @Args("folderId", { type: () => String }) folderId: string,
        @Args("path", { type: () => String }) path: string,
        @Args("ownerId") ownerId: string,
    ): Promise<File> {
        return this.filesService.uploadFile(file, folderId, path, ownerId);
    }

    @Mutation(() => String)
    async createBucket(@Args("bucketName") bucketName: string): Promise<string> {
        return this.filesService.createBucket(bucketName);
    }

    @Mutation(() => String)
    async deleteFile(@Args("fileId", { type: () => String }) fileId: string): Promise<string> {
        await this.filesService.deleteFile(fileId);
        return `File with ID ${fileId} deleted successfully.`;
    }

    @Mutation(() => File)
    async renameFile(
        @Args("fileId", { type: () => String }) fileId: string,
        @Args("oldName", { type: () => String }) oldName: string,
        @Args("newName", { type: () => String }) newName: string,
    ): Promise<File> {
        return this.filesService.renameFile(fileId, oldName, newName);
    }

    @Mutation(() => File)
    async cloneFile(@Args("fileId", { type: () => String }) fileId: string): Promise<File> {
        return this.filesService.cloneFile(fileId);
    }
}
