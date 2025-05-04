import { hostEmail, transporter } from "../config/mail.config";

interface MailPayload {
    to: string;
    subject: string;
    html: string;
}

interface DiscordPayload {
    webhookUrl: string;
    message: string;
}

export default class NotificationService {
    private transporter;
    private hostEmail;
    private static instance: NotificationService;
    constructor() {
        this.transporter = transporter;
        this.hostEmail = hostEmail;
    }

    static  getInstance () {
       if (!NotificationService.instance) {
            NotificationService.instance =  new NotificationService()
       }
       return NotificationService.instance
    }

    private async sendMail({ to, subject, html }: MailPayload) {
        await this.transporter.sendMail({
            from: this.hostEmail,
            to,
            subject,
            html
        });
    }

    private async sendDiscord({ webhookUrl, message }: DiscordPayload) {
        try {
          const payload = JSON.stringify({ content: message });
      
          await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: payload,
          });
      
          console.log("Discord notification sent successfully.");
        } catch (error) {
          console.error("Error sending Discord notification:", error);
        }
      }


    async sendEmailFailureAlert(email: string, url: string): Promise<void> {
        const subject = `🚨 API Down Alert: ${url}`;
        const html = `
          <h2>Uptime Monitor Alert</h2>
          <p>The following URL failed 3 times and has been marked as inactive:</p>
          <link href=${url} ><strong> ${url} </strong></link>
          <p>Please check your server or endpoint.</p>
        `;
        await this.sendMail({ to: email, subject, html });
    }

    async sendWelcomeEmail(email: string, username: string): Promise<void> {
        const subject = `👋 Welcome, ${username}`;
        const html = `<p>
        Hi ${username}, welcome to our uptime-bot! We're excited to have you on board. 
        You can start monitoring your APIs by adding them to our monitoring service!
        </p>`;
        await this.sendMail({ to: email, subject, html });
    }

    async sendDiscordFailureAlert(webhookUrl:string, url:string){
        const message = `🚨 API Down Alert: ${url} has failed 3 times and has been marked as inactive. Please check the server or endpoint.`;
        await this.sendDiscord({webhookUrl, message})
    }
}