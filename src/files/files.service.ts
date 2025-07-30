import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
    S3Client,
    PutObjectCommand,
    CreateBucketCommand,
    type BucketLocationConstraint,
    DeleteObjectCommand,
    HeadObjectCommand,
    CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { File } from "./file.entity";

@Injectable()
export class FilesService {
    private s3: S3Client;

    constructor(@InjectModel(File.name) private readonly fileModel: Model<File>) {
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        const region = process.env.AWS_REGION;

        if (!accessKeyId || !secretAccessKey || !region) {
            throw new Error("AWS credentials or region are not defined in environment variables.");
        }

        this.s3 = new S3Client({
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            region,
        });
    }

    async uploadFile(file: any, folderId: string, path: string, ownerId: string): Promise<File> {
        const { createReadStream, filename, mimetype } = await file;

        let key = path ? `${path}/${filename}` : filename;

        key = key.replace(/\/+/g, "/").replace(/^\//, "").replace(/\/$/, "");

        try {
            const headCommand = new HeadObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
            });
            await this.s3.send(headCommand);
            throw new Error(`A file with the name "${filename}" already exists at the specified path.`);
        } catch (error) {
            if (error.name !== "NotFound") {
                console.error("Error checking file existence:", error);
                throw error;
            }
        }

        const fileStream = createReadStream();

        const contentLength = await new Promise<number>((resolve, reject) => {
            let totalLength = 0;
            fileStream.on("data", (chunk) => {
                totalLength += chunk.length;
            });
            fileStream.on("end", () => resolve(totalLength));
            fileStream.on("error", (error) => reject(error));
        });

        const uploadStream = createReadStream();

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: uploadStream,
            ContentType: mimetype,
            ContentLength: contentLength,
        });

        try {
            const response = await this.s3.send(command);
        } catch (error) {
            console.error("Error uploading file:", error);
            throw error;
        }

        const newFile = new this.fileModel({
            name: filename,
            folderId,
            ownerId,
            url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
            mimetype,
            createdAt: new Date(),
        });

        return newFile.save();
    }

    async createBucket(bucketName: string): Promise<string> {
        try {
            const region = process.env.AWS_REGION as BucketLocationConstraint;

            if (!region) {
                throw new Error("AWS_REGION is not defined in environment variables.");
            }

            const command = new CreateBucketCommand({
                Bucket: bucketName,
                CreateBucketConfiguration: {
                    LocationConstraint: region,
                },
            });

            const response = await this.s3.send(command);
            return `Bucket "${bucketName}" created successfully in region "${region}"`;
        } catch (error) {
            console.error("Error creating bucket:", error);
            throw new Error(`Failed to create bucket: ${error.message}`);
        }
    }

    async deleteFile(fileId: string): Promise<void> {
        const fileObjectId = new Types.ObjectId(fileId);

        const file = await this.fileModel.findById(fileObjectId).lean().exec();
        if (!file) {
            throw new Error("File not found");
        }

        const key = file.url.split(`${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];

        if (!key) {
            throw new Error("Invalid file URL");
        }

        const command = new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
        });

        try {
            await this.s3.send(command);
        } catch (error) {
            console.error("Error deleting file from S3:", error);
            throw error;
        }

        await this.fileModel.deleteOne({ _id: fileObjectId }).exec();
    }

    async renameFile(fileId: string, oldName: string, newName: string): Promise<File> {
        const file = await this.fileModel.findById(fileId).exec();

        if (!file) {
            throw new Error("File not found");
        }

        if (file.name !== oldName) {
            throw new Error("Old name does not match the current file name");
        }

        const existingFile = await this.fileModel
            .findOne({
                name: newName,
                folderId: file.folderId,
                ownerId: file.ownerId,
            })
            .exec();

        if (existingFile) {
            throw new Error("A file with this name already exists in the same directory");
        }

        const oldS3Path = file.url.split(
            `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
        )[1];
        const folderPath = oldS3Path.split("/").slice(0, -1).join("/");
        const newS3Path = `${folderPath}${newName}`;

        await this.moveFileInS3(oldS3Path, newS3Path);

        file.name = newName;
        file.url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${newS3Path}`;
        await file.save();

        return file;
    }

    async moveFileInS3(oldPath: string, newPath: string): Promise<void> {
        try {
            const encodedOldPath = encodeURIComponent(`${process.env.AWS_BUCKET_NAME!}/${oldPath}`);
            const sanitizedNewPath = newPath.replace(/\/+/g, "/").replace(/^\//, "").replace(/\/$/, "");

            const copyCommand = new CopyObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME!,
                CopySource: encodedOldPath,
                Key: sanitizedNewPath,
            });
            await this.s3.send(copyCommand);

            const deleteCommand = new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME!,
                Key: oldPath,
            });
            await this.s3.send(deleteCommand);
        } catch (error) {
            console.error("Error moving file in S3:", error);
            throw error;
        }
    }

    async cloneFile(fileId: string): Promise<File> {
        const file = await this.fileModel.findById(fileId).exec();

        if (!file) {
            throw new Error("File not found");
        }

        const oldS3Path = file.url.split(
            `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
        )[1];
        const newS3Path = `${oldS3Path.split("/").slice(0, -1).join("/")}${file.name.split(".")[0]} (copy).${file.name.split(".")[1]}`;

        const copyCommand = new CopyObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            CopySource: encodeURIComponent(`${process.env.AWS_BUCKET_NAME}/${oldS3Path}`),
            Key: newS3Path,
        });

        try {
            await this.s3.send(copyCommand);
        } catch (error) {
            console.error("Error cloning file in S3:", error);
            throw new Error("Failed to clone file in S3");
        }

        const clonedFileData = {
            ...file.toObject(),
            _id: undefined,
            name: `${file.name.split(".")[0]} (copy).${file.name.split(".")[1]}`,
            url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${newS3Path}`,
            createdAt: new Date(),
        };

        const clonedFile = new this.fileModel(clonedFileData);

        await clonedFile.save();
        return clonedFile;
    }

    async cloneFileToFolder(fileId: string, targetFolderId: string): Promise<File> {
        const file = await this.fileModel.findById(fileId).exec();

        if (!file) {
            throw new Error("File not found");
        }

        const oldS3Path = file.url.split(
            `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
        )[1];
        const newS3Path = `${oldS3Path.split("/").slice(0, -1).join("/")}/${file.name.split(".")[0]} (copy).${file.name.split(".")[1]}`;

        const copyCommand = new CopyObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            CopySource: encodeURIComponent(`${process.env.AWS_BUCKET_NAME}/${oldS3Path}`),
            Key: newS3Path,
        });

        try {
            await this.s3.send(copyCommand);
        } catch (error) {
            console.error("Error cloning file in S3:", error);
            throw new Error("Failed to clone file in S3");
        }

        const clonedFileData = {
            ...file.toObject(),
            _id: undefined,
            folderId: targetFolderId,
            name: `${file.name.split(".")[0]} (copy).${file.name.split(".")[1]}`,
            url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${newS3Path}`,
            createdAt: new Date(),
        };

        const clonedFile = new this.fileModel(clonedFileData);

        await clonedFile.save();
        return clonedFile;
    }

    async cloneFileToFolderWithNewPath(fileId: string, targetFolderId: string, newS3Path: string): Promise<File> {
        const file = await this.fileModel.findById(fileId).exec();

        if (!file) {
            throw new Error("File not found");
        }

        const oldS3Path = file.url.split(
            `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
        )[1];

        const copyCommand = new CopyObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            CopySource: encodeURIComponent(`${process.env.AWS_BUCKET_NAME}/${oldS3Path}`),
            Key: newS3Path,
        });

        try {
            await this.s3.send(copyCommand);
        } catch (error) {
            console.error("Error cloning file in S3:", error);
            throw new Error("Failed to clone file in S3");
        }

        const clonedFileData = {
            ...file.toObject(),
            _id: undefined,
            folderId: targetFolderId,
            name: file.name,
            url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${newS3Path}`,
            createdAt: new Date(),
        };

        const clonedFile = new this.fileModel(clonedFileData);
        await clonedFile.save();

        return clonedFile;
    }
}
