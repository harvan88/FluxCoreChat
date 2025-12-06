import type { MessageEnvelope } from './message-core';

export type NotificationEvent = 
  | 'message:new'
  | 'message:read'
  | 'message:updated'
  | 'typing:start'
  | 'typing:stop'
  | 'conversation:updated'
  | 'ai:suggestion';

export interface NotificationPayload {
  event: NotificationEvent;
  data: unknown;
  timestamp: Date;
}

export interface INotificationService {
  /**
   * Broadcast a message to all connected clients in a conversation
   */
  broadcast(envelope: MessageEnvelope): Promise<void>;
  
  /**
   * Send a notification to specific account
   */
  notify(accountId: string, payload: NotificationPayload): Promise<void>;
  
  /**
   * Subscribe to notifications for an account
   */
  subscribe(accountId: string, callback: (payload: NotificationPayload) => void): void;
  
  /**
   * Unsubscribe from notifications
   */
  unsubscribe(accountId: string): void;
}
