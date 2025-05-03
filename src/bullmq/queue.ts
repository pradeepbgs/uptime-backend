import { Queue } from 'bullmq';
import { redisClient } from '../config/redis';

export const pingQueue = new Queue('ping-queue', {
  connection:redisClient
});
