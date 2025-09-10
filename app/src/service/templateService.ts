import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { NotificationType } from '../common/types';

interface TemplateData {
  subject: string;
  html: string;
  text: string;
}

interface EmailData {
  userName?: string;
  accountNumber?: string;
  registrationDate?: string;
  loginTime?: string;
  ipAddress?: string;
  device?: string;
  amount?: number;
  merchant?: string;
  cardNumber?: string;
  transactionDate?: string;
  transactionId?: string;
  cardType?: string;
  expirationDate?: string;
  activationRequired?: boolean;
  url?: string;
  [key: string]: any;
}

export class S3TemplateService {
  private s3Client: S3Client;
  private templatesBucket: string;
  private templateCache = new Map<string, TemplateData>();
  private cacheTimeout = 5 * 60 * 1000; 
  private cacheTimestamps = new Map<string, number>();

  constructor() {
    this.s3Client = new S3Client({ 
      region: process.env.REGION || 'us-east-2' 
    });
    this.templatesBucket = process.env.S3_BUCKET_NAME || 'infernobank-notifications-templates-dev-jwl7dsk2';
  }

  async getTemplate(type: NotificationType): Promise<TemplateData> {
    const cacheKey = type;
    const now = Date.now();
    const timestamp = this.cacheTimestamps.get(cacheKey);
    
    // Verificar cache
    if (this.templateCache.has(cacheKey) && timestamp && (now - timestamp) < this.cacheTimeout) {
      return this.templateCache.get(cacheKey)!;
    }

    try {
      const templateData = await this.loadTemplateFromS3(type);
      this.templateCache.set(cacheKey, templateData);
      this.cacheTimestamps.set(cacheKey, now);
      return templateData;
    } catch (error) {
      console.error(`Failed to load template for ${type}:`, error);
      throw new Error(`Template not found for notification type: ${type}`);
    }
  }

  private async loadTemplateFromS3(type: NotificationType): Promise<TemplateData> {
    const templatePath = this.getTemplatePath(type);
    
    try {
      let subjectKey, htmlKey, textKey;
      
      if (type === NotificationType.WELCOME) {
        // Welcome templates tienen nombres diferentes
        subjectKey = 'welcome/subject.txt';
        htmlKey = 'welcome/body.html';
        textKey = 'welcome/body.txt';
      } else {
        // Otros templates siguen el patrón estándar
        subjectKey = `${templatePath}-subject.txt`;
        htmlKey = `${templatePath}-body.html`;
        textKey = `${templatePath}-body.txt`;
      }

      const [subjectContent, htmlContent, textContent] = await Promise.all([
        this.getS3Object(subjectKey),
        this.getS3Object(htmlKey),
        this.getS3Object(textKey)
      ]);

      return {
        subject: subjectContent,
        html: htmlContent,
        text: textContent
      };
    } catch (error) {
      throw new Error(`Failed to load template files for ${type}: ${(error as Error).message}`);
    }
  }

  private async getS3Object(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.templatesBucket,
        Key: key
      });

      const response = await this.s3Client.send(command);
      const content = await response.Body?.transformToString();
      
      if (!content) {
        throw new Error(`Empty content for key: ${key}`);
      }
      
      return content;
    } catch (error) {
      throw new Error(`Failed to get S3 object ${key}: ${(error as Error).message}`);
    }
  }

  private getTemplatePath(type: NotificationType): string {
    const templatePaths: Record<NotificationType, string> = {
      [NotificationType.WELCOME]: 'welcome',
      [NotificationType.USER_LOGIN]: 'user/login',
      [NotificationType.USER_UPDATE]: 'user/update',
      [NotificationType.CARD_CREATE]: 'card/create',
      [NotificationType.CARD_ACTIVATE]: 'card/activate',
      [NotificationType.TRANSACTION_PURCHASE]: 'transaction/purchase',
      [NotificationType.TRANSACTION_SAVE]: 'transaction/save',
      [NotificationType.TRANSACTION_PAID]: 'transaction/paid',
      [NotificationType.REPORT_ACTIVITY]: 'report/activity'
    };

    const path = templatePaths[type];
    if (!path) {
      throw new Error(`No template path defined for notification type: ${type}`);
    }

    return path;
  }

  renderTemplate(template: TemplateData, data: EmailData): {
    subject: string;
    html: string;
    text: string;
  } {
    try {
      // Simple string replacement instead of Handlebars
      const subject = this.replaceVariables(template.subject, data);
      const html = this.replaceVariables(template.html, data);
      const text = this.replaceVariables(template.text, data);

      return { subject, html, text };
    } catch (error) {
      throw new Error(`Template rendering failed: ${(error as Error).message}`);
    }
  }

  private replaceVariables(template: string, data: EmailData): string {
    let result = template;
    
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, String(value));
      }
    });

    result = result.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, variable, content) => {
      return data[variable] ? content : '';
    });

    return result;
  }

  clearCache(): void {
    this.templateCache.clear();
    this.cacheTimestamps.clear();
  }
}
