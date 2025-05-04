import { Worker } from "bullmq";
import { redisClient } from "../config/redis";
import NotificationService from "../services/mail.service";

const notificationService = NotificationService.getInstance();

const mailWorker = new Worker(
    'mail-queue',
    async (job) => {
        const { email, url, webhook, notifyDiscord } = job.data;
        console.log('coming data', job.data)
        try {
            if (notifyDiscord && webhook) {
                await notificationService.sendDiscordFailureAlert(webhook, url);
                console.log(`Discord notification sent for URL: ${url}`);
                return;
            }

            if (email) {
                await notificationService.sendEmailFailureAlert(email, url);
                console.log(`Email sent successfully to ${email}`);
                return;
            }
        } catch (error) {
            console.error(`Failed to send notification for URL ${url}`, error);
            throw new Error('Notification failed');
        }
    },
    {
        connection: redisClient,
        concurrency: 5
    }
);

mailWorker.on('completed', (job) => {
    console.log(`Job completed successfully for ${job.data.email || job.data.webhook}`);
});

mailWorker.on('failed', (job, err) => {
    console.error(`Failed to process job for ${job?.data?.email || job?.data?.webhook}:`, err.message);
});
