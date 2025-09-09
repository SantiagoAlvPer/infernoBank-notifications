import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import Handlebars from 'handlebars';
import { NotificationType } from '../common/types';

interface TemplateData {
  subject: string;
  html: string;
  text: string;
}

export class S3TemplateService {
  private s3Client: S3Client;
  private templatesBucket: string;
  private templateCache = new Map<string, TemplateData>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutos
  private cacheTimestamps = new Map<string, number>();

  constructor() {
    this.s3Client = new S3Client({ 
      region: process.env.AWS_REGION || 'us-east-2' 
    });
    this.templatesBucket = process.env.TEMPLATES_BUCKET || 'templates-email-notification';
    
    this.registerHandlebarsHelpers();
  }

  private registerHandlebarsHelpers(): void {
    // Helper para formatear fechas
    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    // Helper para formatear moneda
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount);
    });

    // Helper para formatear hora
    Handlebars.registerHelper('formatTime', (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    // Helper para año actual
    Handlebars.registerHelper('currentYear', () => {
      return new Date().getFullYear();
    });

    // Helper para capitalizar
    Handlebars.registerHelper('capitalize', (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    // Helper para ocultar números de tarjeta
    Handlebars.registerHelper('maskCard', (cardNumber: string) => {
      return `****${cardNumber.slice(-4)}`;
    });
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
      const [subjectContent, htmlContent, textContent] = await Promise.all([
        this.getS3Object(`${templatePath}/subject.hbs`),
        this.getS3Object(`${templatePath}/body.html.hbs`),
        this.getS3Object(`${templatePath}/body.text.hbs`)
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

  renderTemplate(template: TemplateData, data: Record<string, any>): {
    subject: string;
    html: string;
    text: string;
  } {
    try {
      const subjectTemplate = Handlebars.compile(template.subject);
      const htmlTemplate = Handlebars.compile(template.html);
      const textTemplate = Handlebars.compile(template.text);

      return {
        subject: subjectTemplate(data),
        html: htmlTemplate(data),
        text: textTemplate(data)
      };
    } catch (error) {
      throw new Error(`Template rendering failed: ${(error as Error).message}`);
    }
  }

  clearCache(): void {
    this.templateCache.clear();
    this.cacheTimestamps.clear();
  }
}