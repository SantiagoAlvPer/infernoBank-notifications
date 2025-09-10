import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
  QueryCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { NotificationRecord, NotificationStatus } from "../common/types";

export class DynamoDBService {
  private dynamoClient: DynamoDBClient;
  private notificationTable: string;
  private notificationErrorTable: string;

  constructor() {
    this.dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-2",
      maxAttempts: 3,
    });
    this.notificationTable =
      process.env.DYNAMODB_TABLE_NAME || "notification-table";
    this.notificationErrorTable =
      process.env.ERROR_TABLE_NAME || "notification-error-table";
  }

  async saveNotificationRecord(record: NotificationRecord): Promise<void> {
    try {
      const command = new PutItemCommand({
        TableName: this.notificationTable,
        Item: marshall(record, { removeUndefinedValues: true }),
      });

      await this.dynamoClient.send(command);
      console.log(`Notification record saved: ${record.uuid}`);
    } catch (error) {
      console.error("Failed to save notification record:", error);
      throw new Error(`DynamoDB save failed: ${(error as Error).message}`);
    }
  }

  async updateNotificationStatus(
    notificationId: string,
    createdAt: string,
    status: NotificationStatus,
    sentAt?: string,
    messageId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateExpressions: string[] = ["#status = :status"];
      const expressionAttributeNames: Record<string, string> = {
        "#status": "status",
      };
      const expressionAttributeValues: Record<string, any> = {
        ":status": { S: status },
      };

      if (sentAt) {
        updateExpressions.push("sentAt = :sentAt");
        expressionAttributeValues[":sentAt"] = { S: sentAt };
      }

      if (messageId) {
        updateExpressions.push("messageId = :messageId");
        expressionAttributeValues[":messageId"] = { S: messageId };
      }

      if (errorMessage) {
        updateExpressions.push("errorMessage = :errorMessage");
        expressionAttributeValues[":errorMessage"] = { S: errorMessage };
      }

      const command = new UpdateItemCommand({
        TableName: this.notificationTable,
        Key: marshall({
          uuid: notificationId,
          createdAt: createdAt,
        }),
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      await this.dynamoClient.send(command);
      console.log(
        `Notification status updated: ${notificationId} -> ${status}`
      );
    } catch (error) {
      console.error("Failed to update notification status:", error);
      throw new Error(`DynamoDB update failed: ${(error as Error).message}`);
    }
  }

  async saveNotificationError(errorRecord: any): Promise<void> {
    try {
      const command = new PutItemCommand({
        TableName: this.notificationErrorTable,
        Item: marshall(errorRecord, { removeUndefinedValues: true }),
      });

      await this.dynamoClient.send(command);
      console.log(`Error record saved: ${errorRecord.uuid}`);
    } catch (error) {
      console.error("Failed to save error record:", error);
      throw new Error(
        `DynamoDB error save failed: ${(error as Error).message}`
      );
    }
  }

  async getNotificationHistory(
    userId: string,
    limit: number = 50
  ): Promise<NotificationRecord[]> {
    try {
      const command = new QueryCommand({
        TableName: this.notificationTable,
        IndexName: "userId-createdAt-index",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": { S: userId },
        },
        Limit: limit,
        ScanIndexForward: false,
      });

      const response = await this.dynamoClient.send(command);
      return (
        response.Items?.map((item) => unmarshall(item) as NotificationRecord) ||
        []
      );
    } catch (error) {
      console.error("Failed to get notification history:", error);
      throw new Error(`DynamoDB query failed: ${(error as Error).message}`);
    }
  }
}
