import type { ContextType } from "diesel-core";
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { secret } from "../constant";
import { UserModel, type IUser } from "../models/user.model";

interface jwtToken extends JwtPayload {
    _id: string;
    email: string;
}

export async function authJwt(ctx: ContextType): Promise<void | null | Response> {
    try {
        let token = ctx.req?.headers?.get("Authorization") ?? ctx.cookies?.accessToken

        if (!token) {
            return ctx.json({ message: "Unauthorized", error: "No token provided" }, 401);
        }


        if (token.startsWith("Bearer ")) {
            token = token.slice(7);
        }

        const decodedToken : jwtToken = jwt?.verify(token, secret);

        if (!decodedToken) {
            return ctx.json({ message: "Unauthorized", error: "Token could not be decoded" }, 401);
        }

        const user = await UserModel.findById(decodedToken._id).select("-password -refreshToken");

        if (!user) {
            return ctx.json({ message: "Unauthorized: User not found" }, 404);
        }

        ctx.set("user", user);
        return;
    } catch (error: any) {
        console.error("JWT verification error:", error?.message);
        let errMsg = "Invalid token";
        if (error.name === "TokenExpiredError") {
            errMsg = "Token expired";
        } else if (error.name === "JsonWebTokenError") {
            errMsg = "Malformed or tampered token";
        }

        return ctx.json({ message: "Unauthorized", error: errMsg }, 401);
    }
}