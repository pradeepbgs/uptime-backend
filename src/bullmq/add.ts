import { pingQueue } from "./queue";

await pingQueue.add('ping-queue', {
    url: 'https://example.com',
    userId: 'abc123'
  }, {
    jobId: `ping-${Date.now()}`, // Optional: unique ID
  });