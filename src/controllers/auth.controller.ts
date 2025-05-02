import type { ContextType, CookieOptions } from "diesel-core"
import { oAuthClient } from "../config/oauth";
import { UserModel, type IUser } from "../models/user.model";
import { generateAccessAndRefreshToken } from "../utils/generate.token";



export const Auth = async (ctx: ContextType) => {
    try {
        const body = await ctx.body
        const { access_token }: { access_token: string } = body

        if (!access_token) {
            console.log('access_token not found')
            ctx.status = 400
            return ctx.json({ error: 'Missing id_token' })
        }

        const ticket = await oAuthClient.verifyIdToken({
            idToken: access_token,
            audience: process.env.GOOGLE_CLIENT_ID
        })
        if (!ticket) {
            console.log('ticket not found')
            ctx.status = 400
            return ctx.json({ error: 'Invalid id_token' })
        }
        const payload = ticket.getPayload();
        if (!payload || !payload?.email) {
            console.log('payload not found')
            ctx.status = 400
            return ctx.json({ error: 'Invalid id_token' })
        }
        // check if user exist in DB
        const existingUser: IUser | null = await UserModel.findOne({ email: payload.email })
        const cookieOptions: CookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        };

        let response;

        if (existingUser) {

            const { accessToken, refreshToken }: { accessToken: string, refreshToken: string } = await generateAccessAndRefreshToken(existingUser)
            
            ctx.status = 200
            ctx.setCookie("accessToken", accessToken, cookieOptions);
            ctx.setCookie("refreshToken", refreshToken, cookieOptions);
            
            response = {
                message: "User logged in successfully",
                user: existingUser,
                accessToken,
                refreshToken
            }
        }
        else {
            const newUser: IUser = new UserModel({
                email: payload.email,
                name: payload.name,
                avatar: payload.picture
            })
            await newUser.save()
            
            const { accessToken, refreshToken }: { accessToken: string, refreshToken: string } = await generateAccessAndRefreshToken(newUser)
            
            ctx.status = 200
            ctx.setCookie("accessToken", accessToken, cookieOptions);
            ctx.setCookie("refreshToken", refreshToken, cookieOptions);
            
            response = {
                message: "User logged in successfully",
                user: newUser,
                accessToken,
                refreshToken
            }
        }

        return ctx.json(response)

    } catch (error: any) {
        console.log('error while auth user ', error?.message)
        return ctx.json({ error: error.message },500)
    }
}


export const Logout = async (ctx: ContextType) => {
    try {
        ctx.status = 200
        ctx.setCookie("accessToken", "", { maxAge: 0 });
        ctx.setCookie("refreshToken", "", { maxAge: 0 });
        return ctx.json({ message: "User logged out successfully" })
    } catch (error: any) {
        return ctx.json({ error: error.message })
    }
}
