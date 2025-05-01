import { Diesel, type ContextType, type CookieOptions } from "diesel-core";
import { rateLimit } from "diesel-core/ratelimit";
import { securityMiddleware } from "diesel-core/security";
import jwt from 'jsonwebtoken'
import { cors } from "diesel-core/cors";
import { authRouter } from "./src/routes/auth.route";
import { taskRouter } from "./src/routes/task.route";
import { UserModel } from "./src/models/user.model";

const app = new Diesel({
    jwtSecret:process.env.JWT_SECRET
})

// Logger
app.useLogger({ app })

// cors
app.use(
    cors({
        origin: ["http://localhost:8080", "http://localhost:3001"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// rate-limit
const limit = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 5,
    message: "Too many requests, please try again later.",
})

app.use(limit)

app.use(securityMiddleware)


app
.setupFilter()
.publicRoutes('/',"/api/v1/auth", "/api/v1/auth/google", "/api/v1/auth/google/callback", '/api/v1/logout')
.permitAll()
.authenticateJwtDB(jwt,UserModel)


app.get("/", (ctx:ContextType) => {
    return ctx.json({ message: "Hello World" })
})


// app.get("/cookie", (ctx: ContextType) => {
//     const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;
//     const REFRESH_TOKEN_SECRET = process.env.JWT_SECRET;
//     const accessToken = jwt.sign({ userId: "123" }, ACCESS_TOKEN_SECRET as string, { expiresIn: '15m' });
//     const refreshToken = jwt.sign({ userId: "123" }, REFRESH_TOKEN_SECRET as string, { expiresIn: '7d' });

//     // Set cookies
//     const cookieOptions: CookieOptions = {
//       httpOnly: true,
//       secure: true,
//       sameSite: 'Strict',
//       maxAge: 7 * 24 * 60 * 60, 
//     };

//     ctx.setCookie('accessToken', accessToken, cookieOptions);
//     ctx.setCookie('refreshToken', refreshToken, cookieOptions);

//     return ctx.json({ message: "Cookies set successfully" });
//   });


app.route("/api/v1/auth", authRouter)
app.route("/api/v1/task", taskRouter)

export {
    app
}