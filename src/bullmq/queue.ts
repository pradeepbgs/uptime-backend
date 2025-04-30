import { Queue } from 'bullmq';
import { connection } from '../config/redis';

export const pingQueue = new Queue('ping-queue', {
  connection
});
