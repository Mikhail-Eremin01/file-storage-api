import { ObjectType, Field, ID } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@ObjectType()
export class PathItem {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;
}

@ObjectType()
@Schema()
export class Folder extends Document {
    @Field(() => ID)
    declare id: string;

    @Prop({ required: true })
    @Field()
    name: string;

    @Prop({ type: String, default: null })
    @Field(() => ID, { nullable: true })
    parentId: string;

    @Prop({ type: [{ id: String, name: String }], default: [], _id: false })
    @Field(() => [PathItem], { defaultValue: [] })
    path: PathItem[];

    @Prop({ required: true })
    @Field()
    ownerId: string;

    @Prop({ type: Date, default: Date.now })
    @Field()
    createdAt: Date;
}

export const FolderSchema = SchemaFactory.createForClass(Folder);
