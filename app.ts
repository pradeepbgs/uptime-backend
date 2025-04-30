import { Diesel, type ContextType } from "diesel-core";
import { rateLimit } from "diesel-core/ratelimit";
import { securityMiddleware } from "diesel-core/security";
import { authRouter } from "./src/services/auth.service";
import jwt from 'jsonwebtoken'
import { cors } from "diesel-core/cors";

const app = new Diesel()

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
.publicRoutes('/',"/register","/login")
.permitAll()
.authenticateJwt(jwt)


app.get("/", (ctx:ContextType) => {
    return ctx.json({ message: "Hello World" })
})

app.route("/api/v1/auth", authRouter)

export {
    app
}