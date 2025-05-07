import { redisClient } from "../config/redis";
import { pingQueue } from "./pingQueue";


const jobDataString = await redisClient.get(`task:task-8`)
if (!jobDataString) {
    console.log('no job string found')
}

const jobData = JSON.parse(jobDataString!);

const job = await pingQueue.getJob(jobData?.taskKey);
if (job) {
    console.log('job found')
    console.log(job.data)
    await job.remove();
} else {
    console.warn('Job not found in queue:', 'task-8');
}

// await redisClient.del(`task:task-8-initial`)