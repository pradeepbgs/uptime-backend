import { Diesel } from "diesel-core";

export const authRouter = new Diesel()

authRouter.post('/register')
authRouter.post('/login')
authRouter.post('/logout')
authRouter.post('/refresh')