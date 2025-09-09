import { SQSEvent, SQSRecord, APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { NotificationService } from '../service/notificationsServices';
import { NotificationData } from '../common/types';

const notificationService = new NotificationService();
const sqsClient = new SQSClient({ region: process.env.REGION || 'us-east-2' });

export const handler = async (
  event: APIGatewayProxyEvent | SQSEvent, 
  context: Context
): Promise<APIGatewayProxyResult | void> => {
  
  // Detectar tipo de evento
  if ('Records' in event) {
    // Es un evento SQS
    return await handleSQSEvent(event as SQSEvent);
  } else {
    // Es un evento API Gateway
    return await handleApiGatewayEvent(event as APIGatewayProxyEvent);
  }
};

async function handleApiGatewayEvent(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('📡 API Gateway request received');
    
    const notificationData: NotificationData = JSON.parse(event.body || '{}');
    
    // Agregar createdAt automáticamente si no existe
    if (!notificationData.createdAt) {
      notificationData.createdAt = new Date().toISOString();
    }
    
    // Enviar a SQS para procesamiento asíncrono
    const command = new SendMessageCommand({
      QueueUrl: process.env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify(notificationData)
    });
    
    await sqsClient.send(command);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Notification queued successfully',
        notificationId: notificationData.uuid,
        timestamp: notificationData.createdAt
      })
    };
  } catch (error) {
    console.error('❌ API Gateway error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to queue notification',
        message: (error as Error).message
      })
    };
  }
}

async function handleSQSEvent(event: SQSEvent): Promise<void> {
  console.log(`🚀 Processing ${event.Records.length} SQS messages`);

  const results = await Promise.allSettled(
    event.Records.map((record, index) => processRecord(record, index))
  );

  const successful = results.filter(result => result.status === 'fulfilled').length;
  const failed = results.filter(result => result.status === 'rejected').length;

  console.log(`📊 Results: ${successful} successful, ${failed} failed`);

  if (failed > 0) {
    console.error(`❌ Failed to process ${failed} out of ${event.Records.length} messages`);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Record ${index} failed:`, result.reason);
      }
    });
  }
}

async function processRecord(record: SQSRecord, index: number): Promise<void> {
  try {
    console.log(`📋 Processing record ${index}:`, record.messageId);
    
    const notificationData: NotificationData = JSON.parse(record.body);
    
    // Procesar la notificación
    const notificationId = await notificationService.processNotification(notificationData);
    
    console.log(`✅ Successfully processed notification: ${notificationId}`);
  } catch (error) {
    console.error(`❌ Failed to process SQS record ${index}:`, error);
    console.error('Record body:', record.body);
    throw error; // Esto enviará el mensaje al DLQ si está configurado
  }
}