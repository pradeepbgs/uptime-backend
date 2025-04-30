import mongoose, { Document, Schema } from "mongoose";
import { model } from "mongoose";

export interface ITask extends Document {
    URL: string;
    isActive: boolean;
    notifyDiscord: boolean;
    webHook: string;
    User: mongoose.Schema.Types.ObjectId;
    logs: string[];
    failedCount: number;
    createdAt: Date;
    max: number;
    interval:number    
}

export interface IUser extends Document {
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
    notifyDiscord: {
        type: Boolean,
        default: false
    },
    webHook: {
        type: String,
        required: false
    },
    User: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    logs: [
        {
            type: String,
            required: false
        }
    ],
    failedCount: {
        type: Number,
        default: 0
    },
    max: {
        type: Number,
        default: 5
    },
    interval: {
        type: Number,
        default: 5,
        min: 1,
        max: 60,
        validate: {
            validator:Number.isInteger,
            message: 'Interval must be an integer between 1 minute and 60 minutes.'
        }
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

