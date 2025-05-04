import * as nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER ?? 'exmaple@gmail.com',
    pass: process.env.MAIL_PASS ?? '',
  },
});

const hostEmail = process.env.MAIL_USER ?? 'example@gmail.com';

export { transporter, hostEmail };
