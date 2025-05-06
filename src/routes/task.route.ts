import { Diesel, type ContextType } from "diesel-core";
import { addTask, deleteTask, getTaskDetails, getUserTasks, updateTask } from "../controllers/task.controller";


export const taskRouter = new Diesel()

taskRouter
    .post('/',addTask)
    .get('/', getUserTasks)
    .get('/:id', getTaskDetails)
    .delete('/:id', deleteTask)
    .put('/:id', updateTask)