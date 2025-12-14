/**
 * C3: Offline-First - IndexedDB Configuration
 * 
 * Configura Dexie.js para almacenamiento local de datos.
 * Implementa Dual Source of Truth según TOTEM PARTE 9.1.
 * 
 * CRITICAL: Base de datos separada por cuenta para aislamiento completo
 */

import Dexie, { type Table } from 'dexie';
import type { 
  LocalMessage, 
  LocalConversation, 
  LocalRelationship,
  SyncQueueItem 
} from './schema';

/**
 * FluxCore Local Database - Per-Account Isolation
 */
export class FluxCoreDB extends Dexie {
  // Tables
  messages!: Table<LocalMessage, string>;
  conversations!: Table<LocalConversation, string>;
  relationships!: Table<LocalRelationship, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor(accountId?: string) {
    // Usar nombre de base de datos único por cuenta
    const dbName = accountId ? `FluxCoreDB_${accountId}` : 'FluxCoreDB';
    super(dbName);
    
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
    
    // Schema version 2 - Add compound index for syncQueue
    this.version(2).stores({
      messages: [
        'id',
        'conversationId',
        'senderAccountId',
        'syncState',
        'localCreatedAt',
        '[conversationId+localCreatedAt]',
      ].join(', '),
      
      conversations: [
        'id',
        'relationshipId',
        'syncState',
        'lastMessageAt',
      ].join(', '),
      
      relationships: [
        'id',
        'accountAId',
        'accountBId',
        'syncState',
      ].join(', '),
      
      // Added compound index [entityType+entityId] for better query performance
      syncQueue: [
        'id',
        'entityType',
        'entityId',
        'operation',
        'status',
        'createdAt',
        '[entityType+entityId]', // Compound index for efficient lookups
      ].join(', '),
    });
  }
}

// Database instance cache por cuenta
const dbInstances = new Map<string, FluxCoreDB>();

/**
 * Obtener instancia de base de datos para una cuenta específica
 */
export function getAccountDB(accountId: string): FluxCoreDB {
  if (!dbInstances.has(accountId)) {
    console.log('[DB] Creating new database instance for account:', accountId);
    dbInstances.set(accountId, new FluxCoreDB(accountId));
  }
  return dbInstances.get(accountId)!;
}

/**
 * Cerrar y limpiar instancia de base de datos de una cuenta
 */
export async function closeAccountDB(accountId: string): Promise<void> {
  const db = dbInstances.get(accountId);
  if (db) {
    console.log('[DB] Closing database for account:', accountId);
    await db.close();
    dbInstances.delete(accountId);
  }
}

/**
 * Limpiar todos los datos de una cuenta específica
 */
export async function clearAccountData(accountId: string): Promise<void> {
  const db = getAccountDB(accountId);
  console.log('[DB] Clearing all data for account:', accountId);
  
  await db.transaction('rw', [db.messages, db.conversations, db.relationships, db.syncQueue], async () => {
    await db.messages.clear();
    await db.conversations.clear();
    await db.relationships.clear();
    await db.syncQueue.clear();
  });
}

/**
 * Eliminar completamente la base de datos de una cuenta
 */
export async function deleteAccountDatabase(accountId: string): Promise<void> {
  await closeAccountDB(accountId);
  const dbName = `FluxCoreDB_${accountId}`;
  console.log('[DB] Deleting database:', dbName);
  await Dexie.delete(dbName);
}

// Default instance (backward compatibility - will use active account)
let currentAccountId: string | null = null;
let currentDB: FluxCoreDB | null = null;

export function setCurrentAccountDB(accountId: string): void {
  if (currentAccountId !== accountId) {
    console.log('[DB] Switching database to account:', accountId);
    currentAccountId = accountId;
    currentDB = getAccountDB(accountId);
  }
}

// Singleton getter - returns current account's DB
export const db = new Proxy({} as FluxCoreDB, {
  get(_, prop: keyof FluxCoreDB) {
    if (!currentDB) {
      // Fallback to legacy DB if no account selected
      if (!dbInstances.has('__legacy__')) {
        dbInstances.set('__legacy__', new FluxCoreDB());
      }
      currentDB = dbInstances.get('__legacy__')!;
    }
    return currentDB[prop];
  }
});

// Export types
export type { 
  LocalMessage, 
  LocalConversation, 
  LocalRelationship,
  SyncQueueItem,
  SyncState,
  PendingOperation,
} from './schema';
