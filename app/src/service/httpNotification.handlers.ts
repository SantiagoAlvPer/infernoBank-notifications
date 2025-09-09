// Crear: app/src/handlers/httpNotification.handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { NotificationService } from './notificationsServices';
import { NotificationData } from '../common/types';

const notificationService = new NotificationService();

export const handler = async (
  event: APIGatewayProxyEvent, 
  context: Context
): Promise<APIGatewayProxyResult> => {
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  try {
    // Manejar preflight OPTIONS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    // Solo permitir POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
      };
    }

    // Validar que hay body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    // Parsear el body
    const notificationData: NotificationData = JSON.parse(event.body);
    
    // Procesar la notificación
    console.log('🚀 Processing notification via HTTP:', notificationData);
    const notificationId = await notificationService.processNotification(notificationData);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        notificationId,
        message: 'Notification sent successfully',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Error processing notification:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    };
  }
};