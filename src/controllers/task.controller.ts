import type { ContextType } from "diesel-core";
import { TaskModel, type IUser } from "../models/user.model";
import { pingQueue } from "../bullmq/queue";
import { redisClient } from "../config/redis";
import removeFromQueue from "../bullmq/worker";
import { Types } from "mongoose";



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

        // if (interval < 1 || interval > 60) {
        //     return ctx.json({ message: 'Interval must be between 1 and 60 minutes' }, 400);
        // }

        const taskCount = await TaskModel.countDocuments({ User: user._id });

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
        await redisClient.set(`task:${task._id}`, JSON.stringify(task))
        pingQueue.add('ping-queue',
            {
                url,
                taskId: task._id,
                max: user.maxTasks,
                webhook: '',
                interval
            }, {
            jobId: task._id as string,
            repeat: {
                every: interval * 60 * 1000
            },
            attempts:3,
            
        })
        return ctx.json({ message: 'Task added successfully', task: task }, 200)
    } catch (error) {
        console.log(error)
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
        await pingQueue.add('ping-queue',
            {
                url,
                taskId: task._id,
                max: user.maxTasks,
                webhook: '',
                interval
            }, {
            jobId: task._id as string,
            repeat: {
                every: interval * 60 * 1000
            },
            attempts:3
        })

        task.url = url;
        task.interval = interval;
        await task.save();
        return ctx.json({ message: 'Task updated successfully', task: task }, 200)
    } catch (error) {
        return ctx.json({ message: 'error while updating task' }, 500)
    }
}

export const getTaskDetails = async (ctx: ContextType) => {
    try {
      const user: IUser = ctx.get('user');
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

        const task = await TaskModel.findOneAndDelete({ _id: id, user: user._id })
        if (!task) {
            return ctx.json({ message: 'Task not found' }, 404)
        }
        await redisClient.del(`task:${task._id}`)
        await removeFromQueue(task._id as string, task.interval)
        return ctx.json({ message: 'Task deleted successfully' }, 200)
    } catch (error) {
        return ctx.json({ message: 'error while deleting task' }, 500)
    }
}