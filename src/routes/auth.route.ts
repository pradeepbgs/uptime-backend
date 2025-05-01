import { Diesel } from "diesel-core";
import { Auth, Logout } from "../controllers/auth.controller";

export const authRouter = new Diesel()

authRouter.post('/', Auth)

authRouter.post('/logout', Logout)