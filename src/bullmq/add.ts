import { pingQueue } from "./queue";

const repeatables = await pingQueue.getRepeatableJobs();
for (const job of repeatables) {
    await pingQueue.removeRepeatableByKey(job.key);
}


await pingQueue.add('ping-queue', {
    url: 'http://localhost:3002',
    userId: 'abc123',
    taskId: "task-mock-task-id-123",
    interval: 1,
    max: 3,
    webhook: '',
    failedCount:0
  }, {
    jobId: `task-mock-task-id-123`, 
    repeat: {
      every: 5 * 1000
    }
  });