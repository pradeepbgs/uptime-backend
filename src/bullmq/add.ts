import { redisClient } from "../config/redis";
import { pingQueue } from "./queue";

const repeatables = await pingQueue.getRepeatableJobs();
for (const job of repeatables) {
  await pingQueue.removeRepeatableByKey(job.key);
}

// for (let i = 0; i < 1000; i++) {
  await redisClient.set(`task:task-mock-task-id-123`, JSON.stringify({
    isActive: true,
    failedCount: 0,
    url: `http://localhost:3002`,
    userId: 'abc123',
    taskId: `task-mock-task-id-123`,
    interval: 1,
    max: 3,
    webHook: '',
    notifyDiscord:false,
    email:'exvillagerbgs@gmail.com'
  }));
  await pingQueue.add('ping-queue', {
    url: `http://localhost:3002`,
    userId: 'abc123',
    taskId: `task-mock-task-id-123`,
    interval: 1,
    max: 3,
    webHook: '',
    failedCount: 0,
    notifyDiscord:false,
    email:'exvillagerbgs@gmail.com'
  }, {
    jobId: `task-mock-task-id-123`,
    attempts: 3,
    repeat: {
      every: 5 * 1000
    }
  });
// }
