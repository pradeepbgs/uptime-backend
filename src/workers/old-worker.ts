import { Worker } from "bullmq";
import { redisClient } from "../config/redis";
import type mongoose from "mongoose";
import { pingQueue } from "../bullmq/pingQueue";
import { mailQueue } from "../bullmq/mailQueue";


interface Task {
    url: string;
    isActive: boolean;
    notifyDiscord: boolean;
    webHook: string;
    user: mongoose.Schema.Types.ObjectId;
    logs: string[];
    failedCount: number;
    createdAt: Date;
    max: number;
    interval: number;
    email: string
}

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
                await removeFromQueue(taskId, interval)
                return
            }
            const task = JSON.parse(taskObj)
            if (!task.isActive) {
                await removeFromQueue(taskId, interval)
                return
            }

            let res: Response;
            try {
                res = await fetch(url)
            } catch (error: any) {
                console.error("Fetch failed:", error);
                await handleFailure(taskId, taskKey, max, task, url)
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
        concurrency: 10
    }
)


async function handleFailure(taskId: string, taskKey: string, attempts: number, taskData: Record<string, number>, url: string) {
    try {
        const currentFailedCount = (taskData.failedCount || 0) + 1;
        console.log('server is down with url %s', url)
        await redisClient.set(taskKey, JSON.stringify({
            ...taskData,
            failedCount: currentFailedCount,
        }));

        if (currentFailedCount < 4) {
            await pingQueue.add('ping-queue', {
                url,
                taskId,
                max: attempts,
                webhook: '',
                interval: taskData.interval
            }, {
                jobId: `${taskId}-retry-${currentFailedCount}`,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                }
            })
                .catch(err => {
                    console.error('Failed to add retry job to queue:', err);
                });

            return
        }
        console.log("we came till this")
        await redisClient.set(taskKey, JSON.stringify({
            ...taskData,
            isActive: false,
            failedCount: currentFailedCount,
        }))
        console.log('now this')
        await removeFromQueue(taskId, taskData.interval!)
        // TODO: push failure notification
        console.log('now this 2')
        // handleNotification(taskData, url)

    } catch (error) {
        console.error('Error in handleFailure:', error);
    }
}

export default async function removeFromQueue(taskId: string, interval: number) {
    await pingQueue.removeRepeatable('ping-queue', {
        every: interval * 60 * 1000,
        jobId: taskId
    })
}



export const handleNotification = (taskData: any, url: string) => {
    // If Discord webhook is provided, send Discord notification
    console.log('we came to handle notification')
    console.log('this is tak data', taskData)
    if (taskData.notifyDiscord && taskData.discordWebhook) {
        mailQueue.add('mail-queue', {
            email: taskData.email,
            url,
            webhook: taskData.discordWebhook,
            notifyDiscord: true
        }, {
            removeOnComplete: true,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000
            }
        })
        .catch(err => {
            console.error('Failed to add Discord failure job to queue:', err);
        });

        return;
    }

    // Default: send email notification if Discord is not provided
    console.log('we came to handle email')
    mailQueue.add('mail-queue', {
        email: taskData.email,
        url,
        webhook: '',
        notifyDiscord: false
    }, {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        }
    })
    .catch(err => {
        console.error('Failed to add email job to queue:', err);
    });
};