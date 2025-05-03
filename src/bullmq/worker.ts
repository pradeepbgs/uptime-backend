import { Worker } from "bullmq";
import { redisClient } from "../config/redis";
import { TaskModel, type ITask } from "../models/user.model";
import { pingQueue } from "./queue";

const repeatables = await pingQueue.getRepeatableJobs();
for (const job of repeatables) {
    await pingQueue.removeRepeatableByKey(job.key);
}

console.log("Worker is starting...");

const worker = new Worker(
    "ping-queue",

    async (job) => {
        const { url, taskId, max, webhook, interval } = job.data;
        const taskKey = `task:${taskId}`;
        try {
            const taskObj = await redisClient.get(taskKey);
            if (!taskObj) {
                await removeFromQueue(taskId,interval)
                return
            }
            const task = JSON.parse(taskObj)
            if (!task.isActive) {
                await removeFromQueue(taskId,interval)
                return
            }

            let res: Response;
            try {
                res = await fetch(url)
            } catch (error: any) {
                console.error("Fetch failed:", error);
                await handleFailure(taskId, taskKey, max, task,url)
                return
            }

            if (res.status !== 200 || !res.ok) {
                console.warn("Non-200 status:", res.status);
                await handleFailure(taskId, taskKey, max, task, url)
                return
            }

            console.log('server is up with url %s', res.status, url)

            await redisClient.set(taskKey, JSON.stringify({
                ...task,
                isActive: true,
                failedCount: 0
            }));

        } catch (error) {
            console.error("Worker error:", error);
        }
    },

    {
        connection: redisClient,
        concurrency: 30
    }
)


async function handleFailure(taskId: string, taskKey: string, attempts: number, taskData: Record<string, number>, url:string) {
    try {
        const count = (taskData.failedCount || 0) + 1;

        await redisClient.set(taskKey, JSON.stringify({
            ...taskData,
            failedCount: count,
        }));

        const task = await redisClient.get(taskKey);
        if (!task) {
            return;
        }
        const taskDatas: ITask = JSON.parse(task);

        if (count >= attempts) {
            await redisClient.set(taskKey, JSON.stringify({
                isActive: false,
                failedCount: count,
            }))

            await removeFromQueue(taskId, taskDatas.interval)
            // TODO: push job to email notification queue
            return;
        }
    } catch (error) {

    }
}

export default async function removeFromQueue(taskId: string, interval:number) {
    await pingQueue.removeRepeatable('ping-queue', {
        every: 1000,
        jobId: taskId
    })
}