import nodemailer, { Transporter } from "nodemailer";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  mailerFrom: string;
}

export const gmailConfig: EmailConfig = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER || "",
    pass: process.env.GMAIL_APP_PASSWORD || "",
  },
  mailerFrom: "infernobank <santiagoandresalvarezpereira@gmail.com>",
};

export const createGmailTransporter = (): Transporter => {
  const transportOptions = {
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER || "",
      pass: process.env.GMAIL_APP_PASSWORD || "",
    },
  };

  return nodemailer.createTransport(transportOptions);
};

export const validateGmailConfig = (): boolean => {
  return !!(gmailConfig.auth.user && gmailConfig.auth.pass);
};
