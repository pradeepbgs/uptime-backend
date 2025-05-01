import { type IUser } from "../models/user.model";
import jwt from 'jsonwebtoken'


export const generateAccessAndRefreshToken = async (user:IUser): Promise<{ accessToken: string, refreshToken: string }> => {
    try {

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        return { accessToken, refreshToken };
    } catch (error) {
        console.log("error while generating refresh and access token", error)
        throw {
            status: 500,
            message: "Something went wrong while generating refresh and access token"
        }
    }
}

const generateAccessToken = (user: IUser): string => {
    const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
    const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY;

    if (!ACCESS_TOKEN_SECRET || !ACCESS_TOKEN_EXPIRY) {
        throw new Error("Access token environment variables are not defined.");
    }

    return jwt.sign({ _id: user._id }, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
};


const generateRefreshToken = (user: IUser): string => {
    const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
    const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY;

    if (!REFRESH_TOKEN_SECRET || !REFRESH_TOKEN_EXPIRY) {
        throw new Error("Refresh token environment variables are not defined.");
    }

    return jwt.sign(
        {
            _id: user._id,
            email: user.email,
        },
        REFRESH_TOKEN_SECRET,
        {
            expiresIn: REFRESH_TOKEN_EXPIRY,
        }
    );
};
