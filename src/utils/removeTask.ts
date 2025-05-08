import { pingQueue } from "../bullmq/pingQueue";
import { redisClient } from "../config/redis";



export const removeTask = async (taskId:string) => {
    const jobDataString = await redisClient.get(`task:${taskId}`)
    if (!jobDataString) {
        return { success:false, message: 'no Job found with this ID' }
    }

    const jobData = JSON.parse(jobDataString);

    const job = await pingQueue.getJob(jobData?.taskKey);
    if (job) {
        await job.remove();
        return { success:true, message: 'Task deleted successfully' }
    } else {
        return { message: 'Job not found in queue' }
    }
}