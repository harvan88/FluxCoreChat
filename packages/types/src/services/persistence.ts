import type { Message } from '../entities/message';
import type { MessageEnvelope } from './message-core';

export interface IPersistenceService {
  /**
   * Save a message to the database
   */
  save(envelope: MessageEnvelope): Promise<Message>;
  
  /**
   * Retrieve messages for a conversation
   */
  retrieve(conversationId: string, limit?: number, offset?: number): Promise<Message[]>;
  
  /**
   * Update a message
   */
  update(messageId: string, updates: Partial<Message>): Promise<Message>;
  
  /**
   * Delete a message
   */
  delete(messageId: string): Promise<void>;
}
