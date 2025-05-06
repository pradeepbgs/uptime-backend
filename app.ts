import { Diesel, type ContextType, type CookieOptions } from "diesel-core";
import { rateLimit } from "diesel-core/ratelimit";
import { securityMiddleware } from "diesel-core/security";
import jwt from 'jsonwebtoken'
import { cors } from "diesel-core/cors";
import { authRouter } from "./src/routes/auth.route";
import { taskRouter } from "./src/routes/task.route";
// import { authJwt } from "./src/middlewares/authJwt";
import { secret } from "./src/constant";


const app = new Diesel()



// cors
app.use(cors({
  origin: "http://localhost:3000",
  // methods: ["GET", "POST", "PUT", "DELETE"],
  // allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}))

// Logger
app.useLogger({ app })


// rate-limit
const limit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: "Too many requests, please try again later.",
})

app.use(limit)

app.use(securityMiddleware)

export async function authJwt(ctx: ContextType): Promise<void | null | Response> {
  let token = ctx.req.headers?.get('Authorization') || ctx.cookies.accessToken
  console.log('token', token)
  if (!token) {
    return ctx.json({ message: "Authentication token missing" }, 401);
  }
  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }
  try {
    const user = jwt.verify(token, secret);
    // console.log('user', user)
    ctx.set('user', user);
  } catch (error) {
    console.log('error', error)
    return ctx.json({ message: "Invalid token" }, 403);
  }
}

app
  .setupFilter()
  .publicRoutes(
    '/',
    '/cookie',
    "/api/v1/auth/google",
    "/api/v1/auth/google/callback",
    '/api/v1/logout'
  )
  .permitAll()
  .authenticate([authJwt])


app.get("/", (ctx: ContextType) => {
  return ctx.json({ message: "Hello World" })
})

  .get("/cookie", (ctx: ContextType) => {
    const accessToken = jwt.sign({ userId: "123" }, secret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: "123" }, secret, { expiresIn: '7d' });

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      path: '/',
      secure: false, 
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60,
    };

    ctx.setCookie('accessToken', accessToken, cookieOptions);
    ctx.setCookie('refreshToken', refreshToken, cookieOptions);

    return ctx.json({ message: "Cookies set successfully" });
  });

app.route("/api/v1/auth", authRouter)
app.route("/api/v1/task", taskRouter)

export {
  app
}