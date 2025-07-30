import { ObjectType, Field, ID } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@ObjectType()
@Schema()
export class File extends Document {
    @Field(() => ID)
    declare id: string;

    @Prop({ required: true })
    @Field()
    name: string;

    @Prop({ type: Types.ObjectId, ref: "Folder", nullable: true })
    @Field(() => ID, { nullable: true })
    folderId: Types.ObjectId;

    @Prop({ required: true })
    @Field()
    ownerId: string;

    @Prop({ required: true })
    @Field()
    url: string;

    @Prop({ required: true })
    @Field()
    mimetype: string;

    @Prop({ default: Date.now })
    @Field()
    createdAt: Date;
}

export const FileSchema = SchemaFactory.createForClass(File);
