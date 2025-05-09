import { pingQueue } from "../bullmq/pingQueue";
import { redisClient } from "../config/redis";


export const removeTask = async (taskId: string) => {
    const jobDataString = await redisClient.get(`task:${taskId}`);
    if (!jobDataString) {
        return { success: true, message: 'No job data found; nothing to remove' }; 
    }

    const jobData = JSON.parse(jobDataString);
    const job = await pingQueue.getJob(jobData?.taskKey);

    if (job) {
        await job.remove();
        return { success: true, message: 'Task removed from queue' };
    } else {
        return { success: true, message: 'Job not found in queue, but continuing' };
    }
}
