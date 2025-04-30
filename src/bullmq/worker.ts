import { Queue, Worker } from "bullmq";
import { connection } from "../config/redis";
import { TaskModel } from "../models/user.model";
import { pingQueue } from "./queue";


const worker = new Worker(
    "ping-queue",

    async (job) => {
        try {
            const { url, taskId, max, webhook, interval } = job.data;

            const task = await TaskModel.findById(taskId);
            if (!task || !task.isActive) {
                pingQueue.removeRepeatable('ping-queue', {
                    every: interval * 60 * 1000,
                    jobId: `task-${taskId}`
                })
                return
            }

            const res = await fetch(url)
            if (res.status !== 200 || !res || !res.ok) {
                const updated = await TaskModel.findByIdAndUpdate(
                    taskId,
                    { $inc: { failedCount: 1 } },
                    { new: true }
                )

                if (updated && updated?.failedCount >= max) {
                    updated.isActive = false;
                    await updated.save();

                    // remove the job from queue
                    pingQueue.removeRepeatable('ping-queue', {
                        every: interval * 60 * 1000,
                        jobId: `task-${taskId}`
                    })
                    // send user a email or notify through discrod
                }
            }

            // cache task in redis
            await connection.set(`task-${taskId}`, JSON.stringify({ isActive: true }));
        } catch (error) {
            console.error("Worker error:", error);
        }
    },

    {
        connection,
        concurrency: 30
    }
)