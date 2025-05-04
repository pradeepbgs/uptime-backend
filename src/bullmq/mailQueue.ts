import { Queue } from 'bullmq';
import { redisClient } from '../config/redis';

export const mailQueue = new Queue('mail-queue', {
    connection: redisClient
});
