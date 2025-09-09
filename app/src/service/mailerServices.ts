import { Transporter } from 'nodemailer';
import { createGmailTransporter, validateGmailConfig } from '../common/email-config';
import { 
  NotificationData, 
  WelcomeNotification,
  UserNotification,
  CardNotification,
  TransactionPurchaseNotification,
  TransactionNotification,
  ReportActivityNotification,
  NotificationType,
  EmailResult
} from '../common/types';

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
  }>;
}

export class MailerService {
  private transporter: Transporter;
  private fromEmail: string;

  constructor() {
    if (!validateGmailConfig()) {
      throw new Error('Gmail configuration is invalid. Check GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    }

    this.transporter = createGmailTransporter();
    this.fromEmail = process.env.GMAIL_USER || '';
    
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      console.log('✅ Gmail SMTP connection verified successfully');
    } catch (error) {
      console.error('❌ Gmail SMTP connection failed:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      if (!options.to) {
        throw new Error('Recipient email is required');
      }

      if (!options.subject) {
        throw new Error('Email subject is required');
      }

      if (!options.html && !options.text) {
        throw new Error('Email content (html or text) is required');
      }

      const mailOptions = {
        from: options.from || `"InfernoBank" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments
      };

      console.log(`📧 Sending email to: ${options.to}`);
      console.log(`📋 Subject: ${options.subject}`);

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email sent successfully:', info.messageId);

      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // Método principal para enviar cualquier tipo de notificación
  async sendNotification(notification: NotificationData): Promise<EmailResult> {
    try {
      switch (notification.type) {
        case NotificationType.WELCOME:
          return await this.sendWelcomeEmail(notification as WelcomeNotification);
        
        case NotificationType.USER_LOGIN:
          return await this.sendUserLoginEmail(notification as UserNotification);
          
        case NotificationType.USER_UPDATE:
          return await this.sendUserUpdateEmail(notification as UserNotification);
          
        case NotificationType.CARD_CREATE:
          return await this.sendCardCreateEmail(notification as CardNotification);
          
        case NotificationType.CARD_ACTIVATE:
          return await this.sendCardActivateEmail(notification as CardNotification);
          
        case NotificationType.TRANSACTION_PURCHASE:
          return await this.sendTransactionPurchaseEmail(notification as TransactionPurchaseNotification);
          
        case NotificationType.TRANSACTION_SAVE:
          return await this.sendTransactionSaveEmail(notification as TransactionNotification);
          
        case NotificationType.TRANSACTION_PAID:
          return await this.sendTransactionPaidEmail(notification as TransactionNotification);
          
        case NotificationType.REPORT_ACTIVITY:
          return await this.sendReportActivityEmail(notification as ReportActivityNotification);
          
        default:
          throw new Error(`Unsupported notification type: ${(notification as any).type}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async sendWelcomeEmail(notification: WelcomeNotification): Promise<EmailResult> {
    const { fullname } = notification.data;
    
    const emailOptions: EmailOptions = {
      to: notification.userEmail,
      subject: `🔥 ¡Bienvenido a InfernoBank, ${fullname}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c; text-align: center;">🔥 InfernoBank</h1>
          <h2>¡Hola ${fullname}!</h2>
          <p>Te damos la bienvenida a InfernoBank. Tu cuenta ha sido creada exitosamente.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>¿Qué puedes hacer ahora?</h3>
            <ul>
              <li>Crear tu primera tarjeta</li>
              <li>Revisar tu perfil</li>
              <li>Configurar notificaciones</li>
            </ul>
          </div>
          <p><strong>ID de Usuario:</strong> ${notification.userId}</p>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <hr>
          <p style="font-size: 12px; color: #666; text-align: center;">
            Este es un email automático de InfernoBank.<br>
            Por favor, no respondas a este mensaje.
          </p>
        </div>
      `,
      text: `
        ¡Hola ${fullname}!
        
        Te damos la bienvenida a InfernoBank. Tu cuenta ha sido creada exitosamente.
        
        ¿Qué puedes hacer ahora?
        - Crear tu primera tarjeta
        - Revisar tu perfil  
        - Configurar notificaciones
        
        ID de Usuario: ${notification.userId}
        
        Si tienes alguna pregunta, no dudes en contactarnos.
        
        Este es un email automático de InfernoBank.
        Por favor, no respondas a este mensaje.
      `
    };

    return await this.sendEmail(emailOptions);
  }

  private async sendUserLoginEmail(notification: UserNotification): Promise<EmailResult> {
    const { date } = notification.data;
    
    const emailOptions: EmailOptions = {
      to: notification.userEmail,
      subject: '🔐 Nuevo acceso a tu cuenta - InfernoBank',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c; text-align: center;">🔥 InfernoBank</h1>
          <h2>🔐 Nuevo acceso detectado</h2>
          <p>Se ha detectado un nuevo acceso a tu cuenta de InfernoBank.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Fecha y hora:</strong> ${date.toLocaleString('es-ES')}</p>
            <p><strong>ID de Usuario:</strong> ${notification.userId}</p>
          </div>
          <p>Si no fuiste tú, contacta inmediatamente a nuestro equipo de soporte.</p>
          <hr>
          <p style="font-size: 12px; color: #666; text-align: center;">
            Este es un email automático de InfernoBank.<br>
            Por favor, no respondas a este mensaje.
          </p>
        </div>
      `,
      text: `
        Nuevo acceso detectado - InfernoBank
        
        Se ha detectado un nuevo acceso a tu cuenta de InfernoBank.
        
        Fecha y hora: ${date.toLocaleString('es-ES')}
        ID de Usuario: ${notification.userId}
        
        Si no fuiste tú, contacta inmediatamente a nuestro equipo de soporte.
        
        Este es un email automático de InfernoBank.
        Por favor, no respondas a este mensaje.
      `
    };

    return await this.sendEmail(emailOptions);
  }

  private async sendUserUpdateEmail(notification: UserNotification): Promise<EmailResult> {
    const { date } = notification.data;
    
    const emailOptions: EmailOptions = {
      to: notification.userEmail,
      subject: '✏️ Información actualizada - InfernoBank',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c; text-align: center;">🔥 InfernoBank</h1>
          <h2>✏️ Información actualizada</h2>
          <p>Tu información de perfil ha sido actualizada exitosamente.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Fecha de actualización:</strong> ${date.toLocaleString('es-ES')}</p>
            <p><strong>ID de Usuario:</strong> ${notification.userId}</p>
          </div>
          <p>Si no realizaste estos cambios, contacta inmediatamente a nuestro equipo de soporte.</p>
        </div>
      `,
      text: `
        Información actualizada - InfernoBank
        
        Tu información de perfil ha sido actualizada exitosamente.
        
        Fecha de actualización: ${date.toLocaleString('es-ES')}
        ID de Usuario: ${notification.userId}
        
        Si no realizaste estos cambios, contacta inmediatamente a nuestro equipo de soporte.
      `
    };

    return await this.sendEmail(emailOptions);
  }

  private async sendCardCreateEmail(notification: CardNotification): Promise<EmailResult> {
    const { date, type, amount } = notification.data;
    
    const emailOptions: EmailOptions = {
      to: notification.userEmail,
      subject: `💳 Nueva tarjeta ${type.toLowerCase()} creada - InfernoBank`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c; text-align: center;">🔥 InfernoBank</h1>
          <h2>💳 Nueva tarjeta creada</h2>
          <p>Tu nueva tarjeta ${type.toLowerCase()} ha sido creada exitosamente.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Tipo de tarjeta:</strong> ${type}</p>
            <p><strong>Fecha de creación:</strong> ${date.toLocaleString('es-ES')}</p>
            ${amount ? `<p><strong>Límite inicial:</strong> €${amount.toFixed(2)}</p>` : ''}
          </div>
          <p>Tu tarjeta estará disponible en breve. Te notificaremos cuando esté lista para usar.</p>
        </div>
      `,
      text: `
        Nueva tarjeta creada - InfernoBank
        
        Tu nueva tarjeta ${type.toLowerCase()} ha sido creada exitosamente.
        
        Tipo de tarjeta: ${type}
        Fecha de creación: ${date.toLocaleString('es-ES')}
        ${amount ? `Límite inicial: €${amount.toFixed(2)}` : ''}
        
        Tu tarjeta estará disponible en breve. Te notificaremos cuando esté lista para usar.
      `
    };

    return await this.sendEmail(emailOptions);
  }

  private async sendCardActivateEmail(notification: CardNotification): Promise<EmailResult> {
    const { date, type } = notification.data;
    
    const emailOptions: EmailOptions = {
      to: notification.userEmail,
      subject: `✅ Tarjeta ${type.toLowerCase()} activada - InfernoBank`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c; text-align: center;">🔥 InfernoBank</h1>
          <h2>✅ Tarjeta activada</h2>
          <p>Tu tarjeta ${type.toLowerCase()} ha sido activada exitosamente.</p>
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p><strong>Tipo de tarjeta:</strong> ${type}</p>
            <p><strong>Fecha de activación:</strong> ${date.toLocaleString('es-ES')}</p>
            <p><strong>Estado:</strong> ✅ ACTIVA</p>
          </div>
          <p>Ya puedes comenzar a usar tu tarjeta para realizar transacciones.</p>
        </div>
      `,
      text: `
        Tarjeta activada - InfernoBank
        
        Tu tarjeta ${type.toLowerCase()} ha sido activada exitosamente.
        
        Tipo de tarjeta: ${type}
        Fecha de activación: ${date.toLocaleString('es-ES')}
        Estado: ✅ ACTIVA
        
        Ya puedes comenzar a usar tu tarjeta para realizar transacciones.
      `
    };

    return await this.sendEmail(emailOptions);
  }

  private async sendTransactionPurchaseEmail(notification: TransactionPurchaseNotification): Promise<EmailResult> {
    const { date, amount, cardId, merchant } = notification.data;
    
    const emailOptions: EmailOptions = {
      to: notification.userEmail,
      subject: `💳 Compra realizada por €${amount.toFixed(2)} - InfernoBank`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c; text-align: center;">🔥 InfernoBank</h1>
          <h2>💳 Compra realizada</h2>
          <p>Se ha procesado una compra con tu tarjeta.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Monto:</strong> €${amount.toFixed(2)}</p>
            <p><strong>Comercio:</strong> ${merchant}</p>
            <p><strong>Tarjeta:</strong> ****${cardId.slice(-4)}</p>
            <p><strong>Fecha:</strong> ${date.toLocaleString('es-ES')}</p>
          </div>
          <p>Si no reconoces esta transacción, contacta inmediatamente a nuestro equipo de soporte.</p>
        </div>
      `,
      text: `
        Compra realizada - InfernoBank
        
        Se ha procesado una compra con tu tarjeta.
        
        Monto: €${amount.toFixed(2)}
        Comercio: ${merchant}
        Tarjeta: ****${cardId.slice(-4)}
        Fecha: ${date.toLocaleString('es-ES')}
        
        Si no reconoces esta transacción, contacta inmediatamente a nuestro equipo de soporte.
      `
    };

    return await this.sendEmail(emailOptions);
  }

  private async sendTransactionSaveEmail(notification: TransactionNotification): Promise<EmailResult> {
    const { date, amount, merchant } = notification.data;
    
    const emailOptions: EmailOptions = {
      to: notification.userEmail,
      subject: `💰 Saldo agregado: €${amount.toFixed(2)} - InfernoBank`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c; text-align: center;">🔥 InfernoBank</h1>
          <h2>💰 Saldo agregado</h2>
          <p>Se ha agregado saldo a tu cuenta exitosamente.</p>
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p><strong>Monto agregado:</strong> €${amount.toFixed(2)}</p>
            <p><strong>Origen:</strong> ${merchant}</p>
            <p><strong>Fecha:</strong> ${date.toLocaleString('es-ES')}</p>
          </div>
          <p>El saldo ya está disponible en tu cuenta para usar.</p>
        </div>
      `,
      text: `
        Saldo agregado - InfernoBank
        
        Se ha agregado saldo a tu cuenta exitosamente.
        
        Monto agregado: €${amount.toFixed(2)}
        Origen: ${merchant}
        Fecha: ${date.toLocaleString('es-ES')}
        
        El saldo ya está disponible en tu cuenta para usar.
      `
    };

    return await this.sendEmail(emailOptions);
  }

  private async sendTransactionPaidEmail(notification: TransactionNotification): Promise<EmailResult> {
    const { date, amount, merchant } = notification.data;
    
    const emailOptions: EmailOptions = {
      to: notification.userEmail,
      subject: `✅ Pago realizado: €${amount.toFixed(2)} - InfernoBank`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c; text-align: center;">🔥 InfernoBank</h1>
          <h2>✅ Pago realizado</h2>
          <p>Tu pago ha sido procesado exitosamente.</p>
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p><strong>Monto pagado:</strong> €${amount.toFixed(2)}</p>
            <p><strong>Destino:</strong> ${merchant}</p>
            <p><strong>Fecha:</strong> ${date.toLocaleString('es-ES')}</p>
          </div>
          <p>Tu pago ha sido confirmado y procesado.</p>
        </div>
      `,
      text: `
        Pago realizado - InfernoBank
        
        Tu pago ha sido procesado exitosamente.
        
        Monto pagado: €${amount.toFixed(2)}
        Destino: ${merchant}
        Fecha: ${date.toLocaleString('es-ES')}
        
        Tu pago ha sido confirmado y procesado.
      `
    };

    return await this.sendEmail(emailOptions);
  }

  private async sendReportActivityEmail(notification: ReportActivityNotification): Promise<EmailResult> {
    const { date, url } = notification.data;
    
    const emailOptions: EmailOptions = {
      to: notification.userEmail,
      subject: `📊 Reporte de actividad disponible - InfernoBank`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e74c3c; text-align: center;">🔥 InfernoBank</h1>
          <h2>📊 Reporte de actividad</h2>
          <p>Tu reporte de actividad está listo para descargar.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Fecha de generación:</strong> ${date.toLocaleString('es-ES')}</p>
            <p><strong>Tipo:</strong> Reporte de actividad de cuenta</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${url}" style="background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              📥 Descargar Reporte
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">El enlace de descarga estará disponible por 7 días.</p>
        </div>
      `,
      text: `
        Reporte de actividad - InfernoBank
        
        Tu reporte de actividad está listo para descargar.
        
        Fecha de generación: ${date.toLocaleString('es-ES')}
        Tipo: Reporte de actividad de cuenta
        
        Enlace de descarga: ${url}
        
        El enlace de descarga estará disponible por 7 días.
      `
    };

    return await this.sendEmail(emailOptions);
  }

  async close(): Promise<void> {
    try {
      this.transporter.close();
      console.log('📪 Gmail connection closed');
    } catch (error) {
      console.error('Error closing Gmail connection:', error);
    }
  }
}