import joi from "joi";
import { NotificationType } from "../common/types";

// Schema base con campos de BaseNotification
const baseNotificationSchema = {
  uuid: joi.string().uuid().required(),
  userEmail: joi.string().email().required(), 
  userId: joi.string().min(1).required(),
  createdAt: joi.string().isoDate().optional(), // Opcional porque se genera automáticamente
};

export const WelcomeSchema = joi.object({
  ...baseNotificationSchema,
  type: joi.string().valid(NotificationType.WELCOME).required(),
  data: joi.object({ 
    fullname: joi.string().min(2).max(100).required() 
  }).required(),
});

export const UserSchema = joi.object({
  ...baseNotificationSchema,
  type: joi.string().valid(NotificationType.USER_LOGIN, NotificationType.USER_UPDATE).required(),
  data: joi.object({ 
    date: joi.date().iso().required() 
  }).required(),
});

export const CardSchema = joi.object({
  ...baseNotificationSchema,
  type: joi.string().valid(NotificationType.CARD_CREATE, NotificationType.CARD_ACTIVATE).required(),
  data: joi.object({
    date: joi.date().iso().required(),
    type: joi.string().valid("CREDIT", "DEBIT").required(),
    amount: joi.number().positive().optional(),
  }).required(),
});

export const TransactionPurchaseSchema = joi.object({
  ...baseNotificationSchema,
  type: joi.string().valid(NotificationType.TRANSACTION_PURCHASE).required(),
  data: joi.object({
    date: joi.date().iso().required(),
    amount: joi.number().positive().required(),
    cardId: joi.string().required(),
    merchant: joi.string().min(2).max(100).required(),
  }).required(),
});

export const TransactionSchema = joi.object({
  ...baseNotificationSchema,
  type: joi.string().valid(NotificationType.TRANSACTION_SAVE, NotificationType.TRANSACTION_PAID).required(),
  data: joi.object({
    date: joi.date().iso().required(),
    amount: joi.number().positive().required(),
    merchant: joi.string().min(2).max(100).required(),
  }).required(),
});

export const ReportActivitySchema = joi.object({
  ...baseNotificationSchema,
  type: joi.string().valid(NotificationType.REPORT_ACTIVITY).required(),
  data: joi.object({
    date: joi.date().iso().required(),
    url: joi.string().uri().required(),
  }).required(),
});

// Mapa de schemas por tipo usando el enum
export const NOTIFICATION_SCHEMAS = {
  [NotificationType.WELCOME]: WelcomeSchema,
  [NotificationType.USER_LOGIN]: UserSchema,
  [NotificationType.USER_UPDATE]: UserSchema,
  [NotificationType.CARD_CREATE]: CardSchema,
  [NotificationType.CARD_ACTIVATE]: CardSchema,
  [NotificationType.TRANSACTION_PURCHASE]: TransactionPurchaseSchema,
  [NotificationType.TRANSACTION_SAVE]: TransactionSchema,
  [NotificationType.TRANSACTION_PAID]: TransactionSchema,
  [NotificationType.REPORT_ACTIVITY]: ReportActivitySchema,
};

// Función de validación
export function validateNotification(data: any): { 
  isValid: boolean; 
  errors: string[];
  sanitizedData?: any;
} {
  if (!data.type) {
    return { isValid: false, errors: ['Notification type is required'] };
  }

  const schema = NOTIFICATION_SCHEMAS[data.type as NotificationType];
  if (!schema) {
    return { isValid: false, errors: [`Unknown notification type: ${data.type}`] };
  }

  const { error, value } = schema.validate(data, { 
    abortEarly: false,
    stripUnknown: true, // Remueve campos no definidos
    convert: true,      // Convierte tipos automáticamente
  });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [], sanitizedData: value };
}