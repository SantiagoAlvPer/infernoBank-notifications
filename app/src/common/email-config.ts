import nodemailer, { Transporter } from "nodemailer";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export const gmailConfig: EmailConfig = {
  host: "smtp.gmail.com",
  port: 587, // o 465 para SSL
  secure: false, // true para puerto 465, false para otros puertos
  auth: {
    user: process.env.GMAIL_USER || "",
    pass: process.env.GMAIL_APP_PASSWORD || "",
  },
};

export const createGmailTransporter = (): Transporter => {
  const transportOptions = {
    service: 'gmail', // Esto simplifica la configuración
    auth: {
      user: gmailConfig.auth.user,
      pass: gmailConfig.auth.pass,
    },
  };

  return nodemailer.createTransport(transportOptions);
};

export const validateGmailConfig = (): boolean => {
  return !!(
    gmailConfig.auth.user &&
    gmailConfig.auth.pass
  );
};