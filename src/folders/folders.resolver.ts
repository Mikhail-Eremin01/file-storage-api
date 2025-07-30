import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { FoldersService } from "./folders.service";
import { Folder } from "./folder.entity";
import { ContentsResponse } from "./contents-response.dto";

@Resolver(() => Folder)
export class FoldersResolver {
    constructor(private readonly foldersService: FoldersService) {}

    @Query(() => [Folder])
    async getFolders(@Args("ownerId") ownerId: string): Promise<Folder[]> {
        return this.foldersService.getFolders(ownerId);
    }

    @Mutation(() => Folder)
    async createFolder(
        @Args("name") name: string,
        @Args("parentId", { nullable: true }) parentId: string,
        @Args("ownerId") ownerId: string,
    ): Promise<Folder> {
        try {
            return await this.foldersService.createFolder(name, parentId, ownerId);
        } catch (error) {
            console.error("Error creating folder:", error);
            throw new Error(error.message || "Failed to create folder");
        }
    }

    @Query(() => ContentsResponse)
    async getContents(
        @Args("parentId", { type: () => String, nullable: true }) parentId: string,
        @Args("ownerId", { type: () => String }) ownerId: string,
        @Args("searchTerm", { type: () => String, nullable: true }) searchTerm?: string,
    ): Promise<ContentsResponse> {
        return this.foldersService.getContents(parentId, ownerId, searchTerm);
    }

    @Mutation(() => Folder)
    async deleteFolder(@Args("folderId") folderId: string): Promise<Folder> {
        try {
            const folder = await this.foldersService.getFolderById(folderId);
            if (!folder) {
                throw new Error("Folder not found");
            }

            await this.foldersService.deleteFolder(folderId);

            return {
                id: folder.id,
                name: folder.name,
                parentId: folder.parentId,
                ownerId: folder.ownerId,
                path: folder.path,
                createdAt: folder.createdAt,
            } as Folder;
        } catch (error) {
            console.error("Error deleting folder:", error);
            throw new Error("Failed to delete folder");
        }
    }

    @Mutation(() => Folder)
    async renameFolder(
        @Args("folderId", { type: () => String }) folderId: string,
        @Args("oldName", { type: () => String }) oldName: string,
        @Args("newName", { type: () => String }) newName: string,
    ): Promise<Folder> {
        return this.foldersService.renameFolder(folderId, oldName, newName);
    }

    @Mutation(() => Folder)
    async cloneFolder(@Args("folderId", { type: () => String }) folderId: string): Promise<Folder> {
        return this.foldersService.cloneFolderWithContents(folderId);
    }
}
