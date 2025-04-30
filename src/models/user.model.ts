import mongoose, { Document, Schema } from "mongoose";
import { model } from "mongoose";

interface ITask extends Document {
    URL: string;
    isActive: boolean;
    NotifyDiscord: boolean;
    WebHook: string;
    User: mongoose.Schema.Types.ObjectId;
    Logs: string[];
    FailCound: number;
    createdAt: Date;
}

interface IUser extends Document {
    email: string;
    Tasks: ITask[];
    isPaid: boolean;
    role: string;
}

const TaskSchema = new Schema<ITask>({
    URL: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    NotifyDiscord: {
        type: Boolean,
        default: false
    },
    WebHook: {
        type: String,
        required: false
    },
    User: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    Logs: [
        {
            type: String,
            required: false
        }
    ],
    FailCound: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const userSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
    Tasks: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task"
        }
    ]
})

export const UserModel = model<IUser>("User", userSchema)
export const TaskModel = model<ITask>("Task", TaskSchema)

