import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User } from "./user.schema";

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) {}

    async findOrCreateUser(email: string, name?: string, avatar?: string): Promise<User> {
        let user = await this.userModel.findOne({ email });

        if (!user) {
            user = new this.userModel({ email, name, avatar });
            await user.save();
        }

        return user;
    }

    async findUserByEmail(email: string): Promise<User | null> {
        return this.userModel.findOne({ email }).exec();
    }
}
