import { Queue, Worker } from "bullmq";
import { connection } from "../config/redis";
import { TaskModel } from "../models/user.model";
import { pingQueue } from "./queue";

const repeatables = await pingQueue.getRepeatableJobs();
for (const job of repeatables) {
  await pingQueue.removeRepeatableByKey(job.key);
}

console.log("Worker is starting...");

const worker = new Worker(
    "ping-queue",

    async (job) => {
        console.log('worker called')
        try {
            const { url, taskId, max, webhook, interval } = job.data;
            console.log('worker called with url %s', url)
            // const task = await TaskModel.findById(taskId);
            // if (!task || !task.isActive) {
            //     pingQueue.removeRepeatable('ping-queue', {
            //         every: interval * 60 * 1000,
            //         jobId: `task-${taskId}`
            //     })
            //     return
            // }

            const task = {
                _id: taskId,
                isActive: true,
                failedCount: 0,
                save: async () => console.log("Mock save called"),
            };
            if (!task || !task.isActive) {
                await pingQueue.removeRepeatable('ping-queue', {
                    every: interval * 60 * 1000,
                    jobId: `task-${taskId}`
                });
                return;
            }

            let res: Response;
            try {
                res = await fetch(url)
            } catch (error: any) {
                console.error("Worker error: Unable to fetch URL", error.message);

                task.failedCount += 1;
                if (task.failedCount >= max) {
                    task.isActive = false;
                    // await task.save(); // Mocked save
                    console.log("Task is now inactive due to max failed attempts", task._id);

                    await pingQueue.removeRepeatable('ping-queue', {
                        every: interval * 60 * 1000,
                        jobId: `task-${taskId}`
                    });
                    console.log('job removed from queue')
                }
                return
            }

            if (res.status !== 200 || !res.ok) {
                console.log("Server is down maybe", res.status);

                // Increment failed count for task
                task.failedCount += 1;

                if (task.failedCount >= max) {
                    task.isActive = false;
                    await task.save(); // Save task state change
                    console.log("Task is now inactive due to max failed attempts", task._id);

                    // Remove job from queue
                    await pingQueue.removeRepeatable("ping-queue", {
                        every: interval * 60 * 1000,
                        jobId: `task-${taskId}`,
                    });
                    console.log("Job removed from queue due to failures");
                }

                // const updated = await TaskModel.findByIdAndUpdate(
                //     taskId,
                //     { $inc: { failedCount: 1 } },
                //     { new: true }
                // )

                // if (updated && updated?.failedCount >= max) {
                //     updated.isActive = false;
                //     await updated.save();

                //     // remove the job from queue
                //     pingQueue.removeRepeatable('ping-queue', {
                //         every: interval * 60 * 1000,
                //         jobId: `task-${taskId}`
                //     })
                //     // send user a email or notify through discrod
                // }
            }
            console.log('server is up with url %s', res.status, url)
            // cache task in redis
            // await connection.set(`task-${taskId}`, JSON.stringify({ isActive: true }));
        } catch (error) {
            console.error("Worker error:", error);
        }
    },

    {
        connection,
        concurrency: 30
    }
)

// worker.on('failed', async (job, err) => {
//     console.error(`Job ${job.id} failed with error: ${err.message}`);

//     // If the job reached max retries, remove it from the queue
//     if (job.failedReason) {
//         console.log(`Job ${job.id} has reached max retries, removing...`);
//         await pingQueue.removeRepeatable('ping-queue', {
//             jobId: `task-${job.data.taskId}`,
//             every: job.data.interval * 60 * 1000,
//         });
//         console.log(`Job ${job.id} removed from queue.`);
//     }
// });
