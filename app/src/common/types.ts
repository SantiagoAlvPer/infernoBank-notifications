export enum NotificationType {
  WELCOME = "WELCOME",
  USER_LOGIN = "USER.LOGIN", 
  USER_UPDATE = "USER.UPDATE",
  CARD_CREATE = "CARD.CREATE",
  CARD_ACTIVATE = "CARD.ACTIVATE",
  TRANSACTION_PURCHASE = "TRANSACTION.PURCHASE",
  TRANSACTION_SAVE = "TRANSACTION.SAVE", 
  TRANSACTION_PAID = "TRANSACTION.PAID",
  REPORT_ACTIVITY = "REPORT.ACTIVITY"
}

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface BaseNotification {
  id: string;
  userEmail: string;
  userId: string;
}

export interface WelcomeNotification extends BaseNotification {
  type: NotificationType.WELCOME;
  data: {
    fullname: string;
  };
}

export interface UserNotification extends BaseNotification {
  type: NotificationType.USER_LOGIN | NotificationType.USER_UPDATE;
  data: {
    date: Date;
  };
}

export interface CardNotification extends BaseNotification {
  type: NotificationType.CARD_CREATE | NotificationType.CARD_ACTIVATE;
  data: {
    date: Date;
    type: "CREDIT" | "DEBIT";
    amount?: number;
  };
}

export interface TransactionPurchaseNotification extends BaseNotification {
  type: NotificationType.TRANSACTION_PURCHASE;
  data: {
    date: Date;
    amount: number;
    cardId: string;
    merchant: string;
  };
}

export interface TransactionNotification extends BaseNotification {
  type: NotificationType.TRANSACTION_SAVE | NotificationType.TRANSACTION_PAID;
  data: {
    date: Date;
    amount: number;
    merchant: string;
  };
}

export interface ReportActivityNotification extends BaseNotification {
  type: NotificationType.REPORT_ACTIVITY;
  data: {
    date: Date;
    url: string;
  };
}

export type NotificationData = 
  | WelcomeNotification
  | UserNotification
  | CardNotification
  | TransactionPurchaseNotification
  | TransactionNotification
  | ReportActivityNotification;

export interface NotificationRecord {
  uuid: string;
  createdAt: string;
  type: NotificationType;
  userEmail: string;
  userId: string;
  status: NotificationStatus;
  data: Record<string, any>;
  originalNotificationId?: string;
  sentAt?: string;
  messageId?: string;
  errorMessage?: string;
  updatedAt?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}