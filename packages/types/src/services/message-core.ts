import type { messages } from '@fluxcore/db';

// Tipos derivados del schema
type Message = typeof messages.$inferSelect;
type MessageContent = Message['content'];
type MessageType = Message['type'];

export interface MessageEnvelope {
  id: string;
  conversationId: string;
  senderAccountId: string;
  content: MessageContent;
  type: MessageType;
  generatedBy: 'human' | 'ai';
  timestamp: Date;
}

export interface ReceiveResult {
  success: boolean;
  messageId: string;
  error?: string;
}

export interface IMessageCore {
  /**
   * Receive and process a message
   */
  receive(envelope: MessageEnvelope): Promise<ReceiveResult>;
  
  /**
   * Send a message to a conversation
   */
  send(envelope: MessageEnvelope): Promise<ReceiveResult>;
  
  /**
   * Get message history for a conversation
   */
  getHistory(conversationId: string, limit?: number, offset?: number): Promise<Message[]>;
}
