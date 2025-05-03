import { Diesel, type ContextType } from "diesel-core";
import { addTask, getTaskDetails, getUserTasks } from "../controllers/task.controller";


export const taskRouter = new Diesel()

taskRouter
    .post('/',addTask)
    .get('/', getUserTasks)
    .get('/:id', getTaskDetails)
    .delete('/')
    .put('/')