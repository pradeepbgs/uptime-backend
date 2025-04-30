import { Diesel } from "diesel-core";


export const taskRouter = new Diesel()

taskRouter
    .post('/')
    .get('/')
    .delete('/')
    .put('/')