import mongoose from "mongoose";
import { redisClient } from "../config/redis";
import { pingQueue } from "./pingQueue";

//const repeatables = await pingQueue.getRepeatableJobs();
//for (const job of repeatables) {
  //await pingQueue.removeRepeatableByKey(job.key);
//}

// for (let i = 0; i < 1000; i++) {
  await redisClient.set(`task:task-mock-task-id-123`, JSON.stringify({
    isActive: true,
    failedCount: 0,
    url: `http://localhost:3003`,
    userId: 'abc123',
    taskId: `task-mock-task-id-124`,
    interval: 1,
    max: 3,
    webHook: '',
    notifyDiscord:false,
    email:'exvillagerbgs@gmail.com'
  }));
  
  pingQueue.add("ping-queue", {
    taskId: "task-8",
    url: "http://localhost:3002/cookie",
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
    jobId: "task-8-initial",
    delay: 0,
    removeOnComplete: true,
    removeOnFail: true,
  });
  
  
