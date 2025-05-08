import type { ContextType } from "diesel-core";
import { TaskModel, UserModel, type ITask, type IUser } from "../models/user.model";
import { pingQueue } from "../bullmq/pingQueue";
import { redisClient } from "../config/redis";
import { Types } from "mongoose";
import { removeTask } from "../utils/removeTask";

export const addTask = async (ctx: ContextType) => {
    try {
        let IncomingUser: IUser = ctx.get('user')!;
        const body = await ctx.body;
        if (!body)
            return ctx.json({ message: 'Body is required' }, 400)

        const { url, interval }: { url?: string; interval?: number } = body;

        if (!url || !interval)
            return ctx.json({ message: 'Url and interval are required' }, 400)

        if (interval < 1 || interval > 60) {
            return ctx.json({ message: 'Interval must be between 1 and 60 minutes' }, 400);
        }
        const user = await UserModel.findById(IncomingUser?._id)
        if (!user) {
            return ctx.json({ message: 'User not found' }, 404)
        }
        const taskCount = await TaskModel.countDocuments({ user: user._id });
        console.log('user and his task count', user, taskCount)
        if (taskCount >= user.maxTasks) {
            return ctx.json({
                message: `You have reached the maximum number of tasks (${user.maxTasks}) for your plan.`,
            }, 400);
        }

        // if (interval < user.minInterval) {
        //     return ctx.json({
        //         message: `Minimum interval for your plan is ${user.minInterval} minute(s).`,
        //     }, 400);
        // }

        const task = await TaskModel.create({
            url,
            interval,
            user,
            isActive: true,
            notifyDiscord: false,
            failedCount: 0,
        })
        if (!task) {
            return ctx.json({ message: 'error while saving task' }, 500)
        }
        await redisClient.set(`task:${task._id.toString()}`, JSON.stringify(task))
        const res = await pingQueue.add('ping-queue',
            {
                url,
                taskId: task._id.toString(),
                max: 3,
                webhook: '',
                interval,
                email: user.email,
                isActive: true,
                failedCount: 0,
                taskKey: ''
            }, {
            jobId: task._id.toString() as string,
            removeOnComplete: true,
            removeOnFail: true,
            delay: 0,
        })

        if (!res) {
            return ctx.json({ message: 'error while adding task to queue' }, 500)
        }

        return ctx.json({ message: 'Task added successfully', task: task }, 200)
    } catch (error) {
        console.log(error)
        return ctx.json({ message: 'error while saving task' }, 500)
    }
}

export const getUserTasks = async (ctx: ContextType) => {
    try {
        const user: IUser = ctx.get('user')!;
       
        // const key = `user-task:${user?._id}`;
        // const cachedTask = await redisClient.get(key);

        // if (cachedTask) {
        //     return ctx.json({ task: JSON.parse(cachedTask) });
        // }

        const tasks = await TaskModel.find({ user: user._id });
        if (!tasks) {
            return ctx.json({ message: 'No tasks found' }, 404)
        }
        // await redisClient.set(key, JSON.stringify(tasks));
        return ctx.json({ message: 'Tasks fetched successfully', tasks: tasks }, 200)
    } catch (error) {
        return ctx.json({ message: 'error while fetching tasks' }, 500)
    }
}

export const updateTask = async (ctx: ContextType) => {
    try {
        const user: IUser = ctx.get('user')!;
        const body = await ctx.body;
        if (!body)
            return ctx.json({ message: 'Body is required' }, 400)

        const id = ctx.params.id
        const { url, interval }: { url?: string; interval?: number; id?: string } = body;

        if (!url || !interval || !id)
            return ctx.json({ message: 'Url, interval and id are required' }, 400)

        if (interval < 1 || interval > 60) {
            return ctx.json({ message: 'Interval must be between 1 and 60 minutes' }, 400);
        }

        if (interval < user.minInterval) {
            return ctx.json({
                message: `Minimum interval for your plan is ${user.minInterval} minute(s).`,
            }, 400);
        }

        const task = await TaskModel.findOne({ _id: id, user: user._id });
        if (!task) {
            return ctx.json({ message: 'Task not found' }, 404)
        }

        if (url) {
            task.url = url
        }
        if (interval) {
            task.interval = interval
        }

        const { success } = await removeTask(task._id.toString())
        if (!success) return ctx.json({ message: "Error while trying to update task while removing the existing job" }, 500);

        const res = await pingQueue.add('ping-queue',
            {
                url,
                taskId: task._id.toString(),
                max: 3,
                webhook: '',
                interval,
                email: user.email,
                isActive: true,
                failedCount: 0,
                taskKey: ''
            }, {
            jobId: task._id.toString() as string,
            removeOnComplete: true,
            removeOnFail: true,
            delay: 0,
        })
        if (!res) {
            return ctx.json({ message: 'error while adding updated task to the queue' }, 500)
        }

        await task.save();
        return ctx.json({ message: 'Task updated successfully', task: task }, 200)
    } catch (error) {
        return ctx.json({ message: 'error while updating task' }, 500)
    }
}

export const getTaskDetails = async (ctx: ContextType) => {
    try {
        const user: IUser = ctx.get('user')!;
        const id = ctx.params.id;

        if (!id || !Types.ObjectId.isValid(id)) {
            ctx.status = 400;
            return ctx.json({ message: "Invalid or missing task ID" });
        }

        const key = `task:${id}`;
        const cachedTask = await redisClient.get(key);

        if (cachedTask) {
            return ctx.json({ task: JSON.parse(cachedTask) });
        }

        const taskDetails = await TaskModel.findOne({ _id: id, user: user?._id });

        if (!taskDetails) {
            ctx.status = 404;
            return ctx.json({ message: "Task not found" });
        }
        await redisClient.set(key, JSON.stringify(taskDetails), 'EX', 300);

        return ctx.json({ task: taskDetails });

    } catch (error) {
        console.error("Error fetching task details:", error);
        ctx.status = 500;
        return ctx.json({ message: "Error while fetching task details" });
    }
};


export const deleteTask = async (ctx: ContextType) => {
    try {
        const user: IUser = ctx.get('user')!;

        const id = ctx.params.id
        if (!id)
            return ctx.json({ message: 'Task Id is required' }, 400)

        const task: ITask | null = await TaskModel.findOneAndDelete({ _id: id, user: user._id })
        if (!task) {
            return ctx.json({ message: 'Task not found' }, 404)
        }

        const { success, message } = await removeTask(task._id)
        if (!success) return ctx.json({ message }, 500);

        await redisClient.del(`task:${task._id}`)

        return ctx.json({ message: 'Task deleted successfully' }, 200)
    } catch (error) {
        return ctx.json({ message: 'error while deleting task' }, 500)
    }
}

