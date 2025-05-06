import { Redis } from 'ioredis';

// if in docker compose make host=redis
export const redisClient = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
});

redisClient.on('error', (err) => console.error('Redis connection error:', err));
redisClient.on('connect', () => console.log('Redis connected successfully'));
