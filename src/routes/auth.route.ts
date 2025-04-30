import { Diesel } from "diesel-core";
import { Login, Register } from "../controllers/auth.controller";

export const authRouter = new Diesel()

authRouter
.post('/register', Register)

authRouter
.post('/login', Login)

authRouter
.post('/logout')

authRouter
.post('/refresh')