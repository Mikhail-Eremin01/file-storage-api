import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { FilesService } from "../files/files.service";
import { Folder } from "./folder.entity";
import { File } from "../files/file.entity";

@Injectable()
export class FoldersService {
    constructor(
        @InjectModel(Folder.name) private readonly folderModel: Model<Folder>,
        @InjectModel(File.name) private readonly fileModel: Model<File>,
        private readonly filesService: FilesService,
    ) {}

    async getFolders(ownerId: string): Promise<Folder[]> {
        return this.folderModel.find({ ownerId }).exec();
    }

    async createFolder(name: string, parentId: string, ownerId: string): Promise<Folder> {
        const existingFolder = await this.folderModel
            .findOne({
                name: encodeURIComponent(name),
                parentId: parentId || "",
                ownerId,
            })
            .exec();

        if (existingFolder) {
            throw new Error("A folder with this name already exists in the same directory");
        }

        let path: { id: string; name: string }[] = [];

        if (parentId && parentId.trim() !== "") {
            const parentFolder = await this.folderModel.findById(parentId).exec();
            if (parentFolder) {
                path = [...parentFolder.path];
            } else {
                throw new Error("Parent folder not found");
            }
        }

        const newFolder = new this.folderModel({
            name: encodeURIComponent(name),
            parentId: parentId,
            ownerId,
            path: [],
        });

        const savedFolder = await newFolder.save();

        if (!parentId || parentId.trim() === "") {
            savedFolder.path = [
                { id: (savedFolder._id as Types.ObjectId).toString(), name: decodeURIComponent(savedFolder.name) },
            ];
        } else {
            savedFolder.path = [
                ...path,
                { id: (savedFolder._id as Types.ObjectId).toString(), name: decodeURIComponent(savedFolder.name) },
            ];
        }

        await savedFolder.save();

        return savedFolder;
    }

    async getContents(
        parentId: string,
        ownerId: string,
        searchTerm?: string,
    ): Promise<{ currentFolder: any; folders: any[]; files: any[] }> {
        const foldersQuery = this.folderModel.find({ ownerId });
        const filesQuery = this.fileModel.find({ ownerId });

        if (parentId !== null) {
            foldersQuery.where("parentId").equals(parentId);
            filesQuery.where("folderId").equals(parentId);
        } else {
            foldersQuery.where("parentId").equals(null);
            filesQuery.where("folderId").equals(null);
        }

        if (searchTerm) {
            const regex = new RegExp(searchTerm, "i");
            foldersQuery.where("name").regex(regex);
            filesQuery.where("name").regex(regex);
        }

        const [folders, files] = await Promise.all([foldersQuery.exec(), filesQuery.exec()]);

        const transformedFolders = folders.map((folder) => ({
            id: (folder._id as Types.ObjectId).toString(),
            name: decodeURIComponent(folder.name),
            parentId: folder.parentId,
            ownerId: folder.ownerId,
            createdAt: folder.createdAt,
            path: folder.path.map((pathItem) => ({
                id: pathItem.id,
                name: decodeURIComponent(pathItem.name),
            })),
        }));

        const transformedFiles = files.map((file) => ({
            id: (file._id as Types.ObjectId).toString(),
            name: file.name,
            url: file.url,
            mimetype: file.mimetype,
            createdAt: file.createdAt,
            ownerId: file.ownerId,
            folderId: file.folderId,
        }));

        const transformedCurrentFolder = parentId ? await this.getFolderById(parentId) : null;

        return { currentFolder: transformedCurrentFolder, folders: transformedFolders, files: transformedFiles };
    }

    async deleteFolder(folderId: string): Promise<void> {
        const folderObjectId = new Types.ObjectId(folderId);

        const subFolders = await this.folderModel.find({ parentId: folderObjectId }).lean().exec();

        for (const subFolder of subFolders) {
            await this.deleteFolder(subFolder._id.toString());
        }

        const files = await this.fileModel.find({ folderId }).lean().exec();

        for (const file of files) {
            await this.filesService.deleteFile(file._id.toString());
        }

        await this.folderModel.deleteOne({ _id: folderObjectId }).exec();
    }

    async getFolderById(folderId: string): Promise<Folder | null> {
        return this.folderModel.findById(folderId).exec();
    }

    async renameFolder(folderId: string, oldName: string, newName: string): Promise<Folder> {
        const folder = await this.folderModel.findById(folderId).exec();

        if (!folder) {
            throw new Error("Folder not found");
        }

        if (folder.name !== encodeURIComponent(oldName)) {
            throw new Error("Old name does not match the current folder name");
        }

        const existingFolder = await this.folderModel
            .findOne({
                name: encodeURIComponent(newName),
                parentId: folder.parentId,
                ownerId: folder.ownerId,
            })
            .exec();

        if (existingFolder) {
            throw new Error("A folder with this name already exists in the same directory");
        }

        folder.name = encodeURIComponent(newName);

        const updatedPath = folder.path.map((pathItem) => {
            if (pathItem.id === folderId) {
                return { id: folderId, name: decodeURIComponent(newName) };
            }
            return pathItem;
        });
        folder.path = updatedPath;

        await folder.save();

        await this.updateChildPaths(folderId, updatedPath);

        return folder;
    }

    async updateChildPaths(parentFolderId: string, updatedPath: { id: string; name: string }[]): Promise<void> {
        const childFolders = await this.folderModel.find({ parentId: parentFolderId }).exec();

        for (const childFolder of childFolders) {
            const newFolderPath = [
                ...updatedPath,
                { id: (childFolder._id as Types.ObjectId).toString(), name: decodeURIComponent(childFolder.name) },
            ];
            childFolder.path = newFolderPath;
            await childFolder.save();

            await this.updateChildPaths((childFolder._id as Types.ObjectId).toString(), newFolderPath);
        }

        const files = await this.fileModel.find({ folderId: parentFolderId }).exec();
        for (const file of files) {
            const oldS3Path = file.url.split(
                `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
            )[1];
            const newS3Path = this.generateNewS3Path(updatedPath, file.name);

            await this.filesService.moveFileInS3(oldS3Path, newS3Path);

            file.url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${newS3Path}`;
            await file.save();
        }
    }

    generateNewS3Path(path: { id: string; name: string }[], fileName: string): string {
        const folderPath = path.map((p) => p.name).join("/");
        return `${folderPath}/${fileName}`;
    }

    async cloneFolder(folderId: string): Promise<Folder> {
        const folder = await this.folderModel.findById(folderId).exec();

        if (!folder) {
            throw new Error("Folder not found");
        }

        const clonedFolderData = {
            ...folder.toObject(),
            _id: undefined,
            name: `${folder.name} (copy)`,
            createdAt: new Date(),
        };

        const clonedFolder = new this.folderModel(clonedFolderData);

        await clonedFolder.save();
        return clonedFolder;
    }

    async cloneFolderWithContents(folderId: string, isRoot: boolean = true): Promise<Folder> {
        const folder = await this.folderModel.findById(folderId).exec();

        if (!folder) {
            throw new Error("Folder not found");
        }

        console.log(`Cloning folder: ${folder.name}`);

        const clonedFolderData = {
            ...folder.toObject(),
            _id: undefined,
            name: isRoot ? `${folder.name} (copy)` : folder.name,
            createdAt: new Date(),
        };

        const clonedFolder = new this.folderModel(clonedFolderData);
        await clonedFolder.save();

        console.log(`Cloned folder ID: ${(clonedFolder._id as Types.ObjectId).toString()}`);

        clonedFolder.path = [
            ...folder.path.slice(0, -1),
            { id: (clonedFolder._id as Types.ObjectId).toString(), name: clonedFolder.name },
        ];
        await clonedFolder.save();

        const files = await this.fileModel.find({ folderId }).exec();
        for (const file of files) {
            const oldS3Path = file.url.split(
                `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
            )[1];
            const newS3Path = this.generateNewS3Path(clonedFolder.path, file.name);

            console.log(`Cloning file: ${file.name}`);
            console.log(`Old S3 Path: ${oldS3Path}`);
            console.log(`New S3 Path: ${newS3Path}`);

            await this.filesService.cloneFileToFolderWithNewPath(
                (file._id as Types.ObjectId).toString(),
                (clonedFolder._id as Types.ObjectId).toString(),
                newS3Path,
            );
        }

        const subFolders = await this.folderModel.find({ parentId: folderId }).exec();
        for (const subFolder of subFolders) {
            const clonedSubFolder = await this.cloneFolderWithContents(
                (subFolder._id as Types.ObjectId).toString(),
                false,
            );
            clonedSubFolder.parentId = (clonedFolder._id as Types.ObjectId).toString();
            await clonedSubFolder.save();
        }

        return clonedFolder;
    }
}
