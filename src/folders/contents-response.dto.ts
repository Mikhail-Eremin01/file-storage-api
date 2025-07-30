import { ObjectType, Field } from "@nestjs/graphql";
import { Folder } from "./folder.entity";
import { File } from "../files/file.entity";

@ObjectType()
export class ContentsResponse {
    @Field(() => Folder, { nullable: true })
    currentFolder?: Folder;

    @Field(() => [Folder])
    folders: Folder[];

    @Field(() => [File])
    files: File[];
}
