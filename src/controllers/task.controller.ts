import type { ContextType } from "diesel-core";
import { TaskModel, type IUser } from "../models/user.model";



export const addTask = async (ctx:ContextType)  => {
    try {
        const user:IUser = ctx.get('user')!;
        const body = ctx.body;
        if(!body)
            return ctx.json({message: 'Body is required'}, 400)

        const {url, interval, max}: {url: string, interval: number} = body;
        if(!url || !interval)
            return ctx.json({message: 'Url and interval are required'}, 400)

        await TaskModel.create({
            url,
            interval,
            user: user._id,
            isActive: true,
            notifyDiscord: false,
            logs: [],
            failedCount: 0,
            max: max || 5
        })
        return ctx.json({message: 'Task added successfully'}, 200)
    } catch (error) {
        return ctx.json({message: 'error while saving task'}, 500)
    }
}

export const getTasks = async (ctx:ContextType) => {
    try {
        
    } catch (error) {
        
    }
}

export const updateTask = async (ctx:ContextType) => {

}

export const deleteTask = async (ctx:ContextType) => {

}