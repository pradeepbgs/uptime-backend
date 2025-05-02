import { Diesel } from "diesel-core";
import { Auth, checkAuth, Logout } from "../controllers/auth.controller";

export const authRouter = new Diesel()

authRouter.post('/google', Auth)

authRouter.post('/logout', Logout)

authRouter.get('/check',checkAuth)