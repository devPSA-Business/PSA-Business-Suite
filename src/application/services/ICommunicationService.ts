export interface SendMessageRequest {
  to: string;
  message: string;
  type: 'WHATSAPP' | 'SMS' | 'EMAIL';
}

export interface ICommunicationService {
  sendMessage(request: SendMessageRequest): Promise<string | void>;
}
