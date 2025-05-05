import mongoose from "mongoose";
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
  
  pingQueue.add("ping-queue", {
    taskId: "task-1",
    url: "http://localhost:3000",
    isActive: true,
    notifyDiscord: false,
    webHook: "",
    user: new mongoose.Types.ObjectId(),
    logs: [],
    failedCount: 0,
    createdAt: new Date(),
    max: 3,
    interval: 0.1, // every 60s
    email: "your@email.com"
  }, {
    jobId: "task-1-initial",
    delay: 0,
    removeOnComplete: true,
    removeOnFail: true,
  });
  
  
