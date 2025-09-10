import { SQSEvent, Context } from "aws-lambda";
import { DynamoDBService } from "../database/dynamodb";
import { validateNotification } from "../schema/notificationsSchema.User";
import { NotificationData } from "../common/types";
import { v4 as uuidv4 } from "uuid";

const dynamoService = new DynamoDBService();

export const handler = async (event: SQSEvent, context: Context) => {
  console.log(`🚨 Processing ${event.Records.length} error messages from DLQ`);

  for (const record of event.Records) {
    try {
      await processErrorRecord(record);
    } catch (error) {
      console.error("Failed to process error record:", error);
      // Guardar error crítico del handler mismo
      await logCriticalError(error, record);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Error records processed",
      timestamp: new Date().toISOString(),
    }),
  };
};

async function processErrorRecord(record: any): Promise<void> {
  const timestamp = new Date().toISOString();
  let parsedMessage: any = null;
  let errorType = "PROCESSING_FAILED";
  let errorDetails: any = {};

  try {
    // Intentar parsear el mensaje original
    parsedMessage = JSON.parse(record.body);
    console.log(
      `Analyzing error for message type: ${parsedMessage.type || "unknown"}`
    );
  } catch (parseError) {
    errorType = "MESSAGE_PARSE_ERROR";
    console.log(`Failed to parse message: ${parseError}`);
  }

  if (parsedMessage) {
    const schemaAnalysis = await analyzeSchemaValidation(parsedMessage);
    if (schemaAnalysis.hasSchemaErrors) {
      errorType = "SCHEMA_VALIDATION_ERROR";
      errorDetails = schemaAnalysis;
    }
  }

  // Crear registro de error detallado
  const errorRecord = {
    uuid: uuidv4(),
    createdAt: timestamp,
    source: "SQS_DLQ",
    errorType: errorType,
    originalMessage: record.body,
    messageId: record.messageId,
    receiptHandle: record.receiptHandle,
    attributes: JSON.stringify(record.attributes),
    retryCount: record.attributes?.ApproximateReceiveCount || "0",

    userEmail: parsedMessage?.userEmail || "unknown",
    userId: parsedMessage?.userId || "unknown",
    notificationType: parsedMessage?.type || "unknown",

    validationErrors: errorDetails.validationErrors ?? null,
    schemaUsed: errorDetails.schemaUsed ?? null,
    missingFields: errorDetails.missingFields ?? null,
    invalidFields: errorDetails.invalidFields ?? null,

    // Información adicional
    errorMessage: generateErrorMessage(errorType, errorDetails, parsedMessage),
    processingAttempts: parseInt(
      record.attributes?.ApproximateReceiveCount || "0"
    ),
    queueReceiveTimestamp: record.attributes?.SentTimestamp,
  };

  await dynamoService.saveNotificationError(errorRecord);
  console.log(`${errorType} record saved: ${errorRecord.uuid}`);

  await logErrorStatistics(errorType, parsedMessage?.type);
}

async function analyzeSchemaValidation(message: any): Promise<{
  hasSchemaErrors: boolean;
  validationErrors?: string[];
  schemaUsed?: string;
  missingFields?: string[];
  invalidFields?: string[];
}> {
  try {
    const validation = validateNotification(message);

    if (!validation.isValid) {
      console.log(
        ` Schema validation failed for type '${message.type}':`,
        validation.errors
      );

      // Analizar tipos específicos de errores
      const missingFields: string[] = [];
      const invalidFields: string[] = [];

      validation.errors.forEach((error) => {
        if (error.includes("required")) {
          const field = extractFieldFromError(error);
          if (field) missingFields.push(field);
        } else if (error.includes("invalid") || error.includes("must be")) {
          const field = extractFieldFromError(error);
          if (field) invalidFields.push(field);
        }
      });

      // CORRECCIÓN: Construir el objeto de retorno de manera más explícita
      const result = {
        hasSchemaErrors: true,
        validationErrors: validation.errors,
        schemaUsed: message.type || "unknown",
      } as any;

      // Solo agregar propiedades si tienen valores
      if (missingFields.length > 0) {
        result.missingFields = missingFields;
      }

      if (invalidFields.length > 0) {
        result.invalidFields = invalidFields;
      }

      return result;
    }

    return { hasSchemaErrors: false };
  } catch (error) {
    console.error("Error during schema analysis:", error);
    return { hasSchemaErrors: false };
  }
}


function extractFieldFromError(errorMessage: string): string | null {
  // Patrones comunes de errores de Joi
  const patterns = [
    /\"([^"]+)\" is required/,
    /\"([^"]+)\" must be/,
    /\"([^"]+)\" is not allowed/,
    /\"([^"]+)\" fails/,
  ];

  for (const pattern of patterns) {
    const match = errorMessage.match(pattern);
if (match) return match[1] ?? null;
  }

  return null;
}


function generateErrorMessage(
  errorType: string,
  errorDetails: any,
  message: any
): string {
  switch (errorType) {
    case "SCHEMA_VALIDATION_ERROR":
      const missingFields = errorDetails.missingFields || [];
      const invalidFields = errorDetails.invalidFields || [];
      let msg = `Schema validation failed for notification type '${
        message?.type || "unknown"
      }'.`;

      if (missingFields.length > 0) {
        msg += ` Missing required fields: ${missingFields.join(", ")}.`;
      }
      if (invalidFields.length > 0) {
        msg += ` Invalid fields: ${invalidFields.join(", ")}.`;
      }

      return msg;

    case "MESSAGE_PARSE_ERROR":
      return "Failed to parse JSON message from SQS queue.";

    case "PROCESSING_FAILED":
      return "General processing failure during notification handling.";

    default:
      return `Unknown error type: ${errorType}`;
  }
}

async function logErrorStatistics(
  errorType: string,
  notificationType: string = "unknown"
): Promise<void> {
  try {
    const statsRecord = {
      uuid: uuidv4(),
      createdAt: new Date().toISOString(),
      recordType: "ERROR_STATISTICS",
      errorType: errorType,
      notificationType: notificationType,
      count: 1,
      date: new Date().toISOString().split("T")[0], 
      hour: new Date().getHours(),
    };

    // Opcional: usar una tabla separada para estadísticas o la misma tabla de errores
    await dynamoService.saveNotificationError(statsRecord);
    console.log(
      `Error statistics logged: ${errorType} for ${notificationType}`
    );
  } catch (error) {
    console.error("Failed to log error statistics:", error);
  }
}

async function logCriticalError(error: any, record: any): Promise<void> {
  try {
    const criticalErrorRecord = {
      uuid: uuidv4(),
      createdAt: new Date().toISOString(),
      errorType: "CRITICAL_HANDLER_ERROR",
      errorMessage: `Error handler failed: ${error.message}`,
      originalMessage: record.body,
      messageId: record.messageId,
      source: "ERROR_HANDLER",
      stackTrace: error.stack,
      userEmail: "system",
      userId: "system",
      notificationType: "HANDLER_ERROR",
    };

    await dynamoService.saveNotificationError(criticalErrorRecord);
    console.error(`🚨 Critical error logged: ${criticalErrorRecord.uuid}`);
  } catch (saveError) {
    console.error(
      "Failed to log critical error - system may be in critical state:",
      saveError
    );
  }
}


export async function retryRecoverableMessage(
  originalMessage: any
): Promise<boolean> {
  try {
    // Validar si el mensaje puede ser corregido automáticamente
    const validation = validateNotification(originalMessage);

    if (!validation.isValid) {
      console.log(
        `❌ Message not recoverable: ${validation.errors.join(", ")}`
      );
      return false;
    }

    // Si pasa la validación, reintentarlo
    console.log(`✅ Message appears recoverable, could be requeued`);
    return true;
  } catch (error) {
    console.error("Error checking message recoverability:", error);
    return false;
  }
}