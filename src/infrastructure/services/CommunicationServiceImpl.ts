import { ICommunicationService, SendMessageRequest } from '@application/services/ICommunicationService';
import { db } from '../../shared/api/db';
import { generateId } from '../../lib/generateId';

export class CommunicationServiceImpl implements ICommunicationService {
  async sendMessage(request: SendMessageRequest): Promise<string | void> {
    console.log(`[CommunicationService] Sending ${request.type} to ${request.to}: ${request.message}`);
    
    try {
      let whatsappUrl: string | undefined;

      if (request.type === 'WHATSAPP') {
        // Format phone number: replace leading '0' with '62' (Indonesia country code)
        let formattedNumber = request.to.replace(/\D/g, ''); // Remove non-digits
        if (formattedNumber.startsWith('0')) {
          formattedNumber = '62' + formattedNumber.substring(1);
        }

        // Generate wa.me URL
        const encodedMessage = encodeURIComponent(request.message);
        whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
      }

      // Save to local history for audit purposes
      await db.notifications.add({
        id: `NOTIF-${generateId()}`,
        recipient: request.to,
        message: request.message,
        status: 'SENT',
        timestamp: Date.now()
      });

      return whatsappUrl;
    } catch (error) {
      console.error('[CommunicationService] Failed to send message or save notification:', error);
    }
  }
}
