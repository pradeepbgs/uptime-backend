import mongoose, { Document, Schema } from "mongoose";
import { model } from "mongoose";
// import jwt from "jsonwebtoken";

export interface ITask extends Document {
    url: string;
    isActive: boolean;
    notifyDiscord: boolean;
    webHook: string;
    user: mongoose.Schema.Types.ObjectId;
    logs: string[];
    failedCount: number;
    createdAt: Date;
    max: number;
    interval: number
}

export interface IUser extends Document {
    email: string;
    name:string;
    avatar:string
    tasks: ITask[];
    isPaid: boolean;
    role: string;
    maxTasks: number;
    maxInterval: number;
    minInterval: number;
}

export interface UserMethods {
    generateAccessToken(): string;
    generateRefreshToken(): string;
  }

const validateEmail = function (email: string) {
    var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email)
};

const TaskSchema = new Schema<ITask>({
    url: {
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
    user: {
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
        // min: 0.1,
        // max: 60,
        // validate: {
        //     validator: Number.isInteger,
        //     message: 'Interval must be an integer between 1 minute and 60 minutes.'
        // }
    },
}, { timestamps: true })

const userSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: [validateEmail, 'Please fill a valid email address'],
    },
    name:{
        type: String,
        required: false,
        default: "User"
    },
    avatar:{
        type: String,
        required: false,
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
    tasks: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task"
        }
    ],
    maxTasks: {
        type: Number,
        default: 5
    },
    maxInterval: {
        type: Number,
        default: 60
    },
    minInterval: {
        type: Number,
        default: 10
    }
}, { timestamps: true })

// userSchema.methods.generateAccessToken = function (): string {
//     const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
//     const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY;

//     if (!ACCESS_TOKEN_SECRET || !ACCESS_TOKEN_EXPIRY) {
//         throw new Error("Access token environment variables are not defined.");
//     }

//     return jwt.sign(
        
//         { _id: this._id },
        
//         ACCESS_TOKEN_SECRET,
        
//         {
//             expiresIn: ACCESS_TOKEN_EXPIRY,
//         }
//     );
// };

export const UserModel = model<IUser>("User", userSchema)
export const TaskModel = model<ITask>("Task", TaskSchema)

