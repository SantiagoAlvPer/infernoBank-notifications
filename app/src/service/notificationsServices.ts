import { Transporter } from 'nodemailer';
import { createGmailTransporter, validateGmailConfig } from '../common/email-config';
import { S3TemplateService } from './templateService';
import { DynamoDBService } from '../database/dynamodb';
import { 
  NotificationData, 
  NotificationType,
  NotificationRecord,
  NotificationStatus
} from '../common/types';
import { v4 as uuidv4 } from 'uuid';

export class NotificationService {
  private transporter: Transporter;
  private templateService: S3TemplateService;
  private dynamoService: DynamoDBService;
  private fromEmail: string;

  constructor() {
    if (!validateGmailConfig()) {
      throw new Error('Gmail configuration is invalid. Check GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    }

    this.transporter = createGmailTransporter();
    this.templateService = new S3TemplateService();
    this.dynamoService = new DynamoDBService();
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

  async processNotification(notification: NotificationData): Promise<string> {
    const notificationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      console.log(`📨 Processing notification ${notificationId} of type ${notification.type}`);

      // 1. Guardar registro inicial como PENDING
      const notificationRecord: NotificationRecord = {
        uuid: notificationId,
        createdAt: timestamp,
        type: notification.type,
        userEmail: notification.userEmail,
        userId: notification.userId,
        status: 'PENDING' as NotificationStatus,
        data: notification.data,
        originalNotificationId: notification.uuid
      };

      await this.dynamoService.saveNotificationRecord(notificationRecord);

      // 2. Obtener template desde S3
      const template = await this.templateService.getTemplate(notification.type);

      // 3. Renderizar el template con los datos
      const renderedContent = this.templateService.renderTemplate(template, {
        ...notification.data,
        userEmail: notification.userEmail,
        userId: notification.userId,
        timestamp: timestamp,
        notificationId: notification.uuid
      });

      // 4. Enviar email
      const mailOptions = {
        from: `"InfernoBank" <${this.fromEmail}>`,
        to: notification.userEmail,
        subject: renderedContent.subject,
        html: renderedContent.html,
        text: renderedContent.text
      };

      console.log(`📧 Sending email to: ${notification.userEmail}`);
      console.log(`📋 Subject: ${renderedContent.subject}`);

      const info = await this.transporter.sendMail(mailOptions);

      // 5. Actualizar registro como SENT
      await this.dynamoService.updateNotificationStatus(
        notificationId,
        timestamp,
        'SENT',
        new Date().toISOString(),
        info.messageId
      );

      console.log(`✅ Notification sent successfully: ${notificationId} (MessageID: ${info.messageId})`);
      return notificationId;

    } catch (error) {
      console.error(`❌ Failed to send notification ${notificationId}:`, error);
      
      // Guardar error en DynamoDB
      await this.saveNotificationError(notificationId, notification, error);
      
      // Actualizar registro como FAILED
      await this.dynamoService.updateNotificationStatus(
        notificationId,
        timestamp,
        'FAILED',
        undefined,
        (error as Error).message
      );
      
      throw error;
    }
  }

  private async saveNotificationError(
    notificationId: string, 
    notification: NotificationData, 
    error: any
  ): Promise<void> {
    try {
      const errorRecord = {
        uuid: uuidv4(),
        createdAt: new Date().toISOString(),
        notificationId,
        originalNotificationId: notification.uuid,
        notificationType: notification.type,
        userEmail: notification.userEmail,
        userId: notification.userId,
        errorMessage: (error as Error).message,
        errorStack: (error as Error).stack,
        errorDetails: JSON.stringify(error),
        service: 'gmail-nodemailer',
        originalData: JSON.stringify(notification.data)
      };

      await this.dynamoService.saveNotificationError(errorRecord);
    } catch (saveError) {
      console.error('Failed to save error record:', saveError);
    }
  }

  async getNotificationHistory(userId: string, limit: number = 50): Promise<NotificationRecord[]> {
    try {
      return await this.dynamoService.getNotificationHistory(userId, limit);
    } catch (error) {
      console.error('Failed to get notification history:', error);
      throw new Error(`Failed to retrieve notification history: ${(error as Error).message}`);
    }
  }

  async sendTestNotification(userEmail: string): Promise<string> {
    const testNotification: NotificationData = {
      uuid: uuidv4(),
      type: NotificationType.WELCOME,
      userEmail,
      userId: 'test-user',
      data: {
        fullname: 'Test User'
      }
    };

    return await this.processNotification(testNotification);
  }

  async sendBulkNotifications(notifications: NotificationData[]): Promise<string[]> {
    const results: string[] = [];
    const batchSize = 10; 

    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (notification) => {
        try {
          const result = await this.processNotification(notification);
          results.push(result);
          return result;
        } catch (error) {
          console.error(`Failed to send notification to ${notification.userEmail}:`, error);
          results.push(`ERROR: ${(error as Error).message}`);
          return null;
        }
      });

      await Promise.all(batchPromises);
      
      // Pausa entre lotes
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  async close(): Promise<void> {
    try {
      this.transporter.close();
      console.log('📪 Gmail connection closed');
    } catch (error) {
      console.error('Error closing Gmail connection:', error);
    }
  }

  getServiceInfo(): { fromEmail: string; templatesEnabled: boolean } {
    return {
      fromEmail: this.fromEmail,
      templatesEnabled: true
    };
  }
}