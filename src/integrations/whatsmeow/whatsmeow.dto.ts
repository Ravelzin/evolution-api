export interface CreateInstanceDto {
  instanceId: string;
}

export interface SendMessageDto {
  number: string;
  message: string;
}

export interface WhatsmeowInstanceDto {
  instanceId: string;
  connected: boolean;
  isLoggedIn: boolean;
  pushName?: string;
  jid?: string;
  businessId?: string;
  status: 'created' | 'connecting' | 'connected' | 'disconnected' | 'error';
}

export interface WhatsmeowMessageDto {
  id: string;
  timestamp: number;
  to: string;
  from?: string;
  text: string;
  fromMe?: boolean;
}

export interface WhatsmeowEventDto {
  type: 'qr' | 'connection' | 'message' | 'disconnected' | 'logged_out' | 'ping';
  instanceId?: string;
  code?: string;
  connected?: boolean;
  messageId?: string;
  from?: string;
  to?: string;
  timestamp?: number;
  text?: string;
  reason?: string;
}

export interface WhatsmeowResponseDto<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}