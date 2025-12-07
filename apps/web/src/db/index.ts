/**
 * C3: Offline-First - IndexedDB Configuration
 * 
 * Configura Dexie.js para almacenamiento local de datos.
 * Implementa Dual Source of Truth según TOTEM PARTE 9.1.
 */

import Dexie, { type Table } from 'dexie';
import type { 
  LocalMessage, 
  LocalConversation, 
  LocalRelationship,
  SyncQueueItem 
} from './schema';

/**
 * FluxCore Local Database
 */
export class FluxCoreDB extends Dexie {
  // Tables
  messages!: Table<LocalMessage, string>;
  conversations!: Table<LocalConversation, string>;
  relationships!: Table<LocalRelationship, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super('FluxCoreDB');
    
    // Schema version 1
    this.version(1).stores({
      // Messages table
      messages: [
        'id',
        'conversationId',
        'senderAccountId',
        'syncState',
        'localCreatedAt',
        '[conversationId+localCreatedAt]', // Compound index for ordering
      ].join(', '),
      
      // Conversations table
      conversations: [
        'id',
        'relationshipId',
        'syncState',
        'lastMessageAt',
      ].join(', '),
      
      // Relationships table
      relationships: [
        'id',
        'accountAId',
        'accountBId',
        'syncState',
      ].join(', '),
      
      // Sync queue for pending operations
      syncQueue: [
        'id',         // UUID primary key
        'entityType',
        'entityId',
        'operation',
        'status',
        'createdAt',
      ].join(', '),
    });
  }
}

// Singleton instance
export const db = new FluxCoreDB();

// Export types
export type { 
  LocalMessage, 
  LocalConversation, 
  LocalRelationship,
  SyncQueueItem,
  SyncState,
  PendingOperation,
} from './schema';
