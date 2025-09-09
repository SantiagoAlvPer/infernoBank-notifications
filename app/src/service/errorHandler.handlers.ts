import { SQSEvent, Context } from 'aws-lambda'; 
import { DynamoDBService } from '../database/dynamodb'; 
import { v4 as uuidv4 } from 'uuid';

const dynamoService = new DynamoDBService();

export const handler = async (event: SQSEvent, context: Context) => { 
  console.log(`🚨 Processing ${event.Records.length} error messages from DLQ`);

  for (const record of event.Records) {
    try {
      await processErrorRecord(record);
    } catch (error) {
      console.error('Failed to process error record:', error);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ 
      message: 'Error records processed',
      timestamp: new Date().toISOString()
    })
  };
};

async function processErrorRecord(record: any): Promise<void> {
  const errorRecord = {
    uuid: uuidv4(),
    createdAt: new Date().toISOString(),
    source: 'SQS_DLQ',
    originalMessage: record.body,
    messageId: record.messageId,
    receiptHandle: record.receiptHandle,
    attributes: JSON.stringify(record.attributes),
    errorType: 'PROCESSING_FAILED',
    retryCount: record.attributes?.ApproximateReceiveCount || '0'
  };

  await dynamoService.saveNotificationError(errorRecord);
  console.log(`💥 DLQ error record saved: ${errorRecord.uuid}`);
}