// app/src/handlers/sendNotification.handler.ts
import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { NotificationService } from '../service/notificationsServices';
import { NotificationData } from '../common/types';

const notificationService = new NotificationService();

export const handler = async (event: SQSEvent, context: Context) => {
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

  return {
    statusCode: 200,
    body: JSON.stringify({
      processed: results.length,
      successful,
      failed,
      timestamp: new Date().toISOString()
    })
  };
};

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