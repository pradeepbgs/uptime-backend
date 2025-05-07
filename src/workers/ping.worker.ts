import { Job, Worker } from "bullmq";
import { redisClient } from "../config/redis";
import mongoose from "mongoose";
import { pingQueue } from "../bullmq/pingQueue";
import { mailQueue } from "../bullmq/mailQueue";
import { TaskModel } from "../models/user.model";
import type { isNoSubstitutionTemplateLiteral } from "typescript";


interface Task {
    taskId: string
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

const jobFailureCounts = new Map<string, number>();


const repeatables = await pingQueue.getRepeatableJobs();
for (const job of repeatables) {
    await pingQueue.removeRepeatableByKey(job.key);
}


await pingQueue.clean(0, 0)
console.log("Worker is starting...");

const worker = new Worker(
    "ping-queue",

    async (job) => {

        const {
            url,
            taskId,
            isActive = true,
            interval,
        }: Task = job.data;

        if (!isActive) {
            console.log(`Task ${taskId} is not active, removing from queue`);
            // await removeFromQueue(taskId,interval);
            return;
        }

        try {
            let res: Response;
            try {
                res = await fetch(url)
            } catch (error: any) {
                console.error("Fetch failed:", error);
                await handleFailure(job)
                return
            }

            if (res.status !== 200 || !res.ok) {
                console.warn("Non-200 status:", res.status);
                await handleFailure(job)
                return
            }

            console.log('server is up with url %s', res.status, url)

            const taskKey = `${taskId}-${Date.now()}`

            await redisClient.set(`task:${taskId}`, JSON.stringify({
                ...job.data,
                isActive: true,
                failedCount: 0,
                taskKey: taskKey
            }));

            await pingQueue.add("ping-queue", job.data, {
                jobId: taskKey,
                delay: interval * 60 * 1000,
                removeOnComplete: true,
                removeOnFail: true,
            });

        } catch (error) {
            console.error("Worker error:", error);
            throw error
        }
    },

    {
        connection: redisClient,
        concurrency: 10
    }
)

async function handleFailure(job: Job<Task>) {
    try {
        const {
            taskId,
            url,
            max,
            failedCount = 0,
            interval,
        } = job.data;
        let currentFailedCount = jobFailureCounts.get(taskId) || 0;
        currentFailedCount++;
        console.log('into handle failure');
        console.log('current failed count', currentFailedCount);
        jobFailureCounts.set(taskId, currentFailedCount);

        if (currentFailedCount < 4) {
            console.log('retrying');
            await job.updateData({
                ...job.data,
                failedCount: currentFailedCount
            })
            console.log('adding retry job')
            await pingQueue.add('ping-queue', job.data, {
                jobId: `${taskId}-retry-${currentFailedCount}-${Date.now()}`,
                attempts: 3,
                delay: 3000,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                },
                removeOnComplete: true,
                removeOnFail: true
            }).catch(err => {
                console.error('Failed to add retry job to queue:', err);
            });

            return;
        }

        // Max retries reached
        console.log('max count reached');
        console.log('removing from queue');
        // await removeFromQueue(taskId,interval);
        jobFailureCounts.delete(taskId);
        await redisClient.set(`task:${taskId}`, JSON.stringify({
            ...job.data,
            isActive: false,
            failedCount: 3
        }))

        // const taskDb = await TaskModel.findById(taskId);
        // if (taskDb) {
        //     taskDb.isActive = false;
        //     taskDb.failedCount = 3;
        //     await taskDb.save();
        // }

        console.log('sending failure notification');
        // handleNotification(job);

    } catch (error) {
        console.error('Error in handleFailure:', error);
        throw error
    }
}

export default async function removeFromQueue(taskId: string, interval: number) {
    const res = await pingQueue.removeRepeatable('ping-queue', {
        every: interval * 1000, // <- match the exact value used in `add`
        jobId: taskId
    });
    console.log('res if rm', res)
}




export const handleNotification = (job: Job<Task>) => {
    // If Discord webhook is provided, send Discord notification
    console.log('into handle notification')
    const {
        url,
        email,
        notifyDiscord,
        webHook
    } = job.data;

    if (notifyDiscord && webHook) {
        mailQueue.add('mail-queue', {
            email: email,
            url,
            webHook,
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
    console.log('mail queue sending')
    mailQueue.add('mail-queue', {
        email: email,
        url,
        webHook: '',
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
