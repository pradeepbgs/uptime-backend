import type { ContextType } from "diesel-core";
import { TaskModel, type IUser } from "../models/user.model";
import { pingQueue } from "../bullmq/queue";



export const addTask = async (ctx: ContextType) => {
    // TASK:
    // - Authenticate user
    // - Extract URL and interval
    // - Free users: interval ≥ 10 min, max 5 tasks
    // - Paid users: interval ≥ 1 min, max 20 tasks
    // - Webhook support will be added later

    try {
        const user: IUser = ctx.get('user')!;
        const body = await ctx.body;
        if (!body)
            return ctx.json({ message: 'Body is required' }, 400)

        const { url, interval }: { url?: string; interval?: number } = body;

        if (!url || !interval)
            return ctx.json({ message: 'Url and interval are required' }, 400)

        if (interval < 1 || interval > 60) {
            return ctx.json({ message: 'Interval must be between 1 and 60 minutes' }, 400);
        }

        const taskCount = await TaskModel.countDocuments({ User: user._id });

        if (taskCount >= user.maxTasks) {
            return ctx.json({
                message: `You have reached the maximum number of tasks (${user.maxTasks}) for your plan.`,
            }, 400);
        }

        if (interval < user.minInterval) {
            return ctx.json({
                message: `Minimum interval for your plan is ${user.minInterval} minute(s).`,
            }, 400);
        }

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
        pingQueue.add('ping-queue',
            {
                url,
                taskId: task._id,
                max: user.maxTasks,
                webhook: '',
                interval
            }, {
            jobId: `task-${task._id}-${user._id}-${interval}`,
            repeat: {
                every: interval * 60 * 1000
            }
        })
        return ctx.json({ message: 'Task added successfully', task: task }, 200)
    } catch (error) {
        return ctx.json({ message: 'error while saving task' }, 500)
    }
}

export const getUserTasks = async (ctx: ContextType) => {
    try {
        const user: IUser = ctx.get('user')!;
        const tasks = await TaskModel.find({ user: user._id });
        if (!tasks) {
            return ctx.json({ message: 'No tasks found' }, 404)
        }
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

        task.url = url;
        task.interval = interval;
        await task.save();
        return ctx.json({ message: 'Task updated successfully', task: task }, 200)
    } catch (error) {
        return ctx.json({ message: 'error while updating task' }, 500)
    }
}

export const deleteTask = async (ctx: ContextType) => {
    try {
        const user: IUser = ctx.get('user')!;
        const id = ctx.params.id
        if (!id)
            return ctx.json({ message: 'Task Id is required' }, 400)

        const task = await TaskModel.findOneAndDelete({ _id: id, user: user._id })
        if (!task) {
            return ctx.json({ message: 'Task not found' }, 404)
        }
        return ctx.json({ message: 'Task deleted successfully' }, 200)
    } catch (error) {
        return ctx.json({ message: 'error while deleting task' }, 500)
    }
}