// Script para generar auditoría técnica completa del sistema de mensajes
// Ejecutar en: node scripts/audit-message-system.js

const fs = require('fs');
const path = require('path');

// Configuración
const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'AUDIT_MESSAGE_SYSTEM_TECHNICAL.md');

// Archivos relacionados con mensajes
const MESSAGE_FILES = [
  { path: 'apps/api/src/core/message-core.ts', title: 'MessageCore' },
  { path: 'apps/api/src/services/message.service.ts', title: 'MessageService' },
  { path: 'apps/api/src/services/conversation.service.ts', title: 'ConversationService' },
  { path: 'apps/api/src/routes/conversations.routes.ts', title: 'Conversations Routes' },
  { path: 'apps/api/src/routes/messages.routes.ts', title: 'Messages Routes' },
  { path: 'apps/api/src/services/message-dispatch.service.ts', title: 'MessageDispatchService' },
  { path: 'apps/api/src/services/ai.service.ts', title: 'AI Service' },
  { path: 'apps/api/src/services/extension-host.service.ts', title: 'ExtensionHostService' },
  { path: 'apps/api/src/websocket/ws-handler.ts', title: 'WebSocket Handler' },
  { path: 'apps/web/src/hooks/useChat.ts', title: 'useChat Hook' },
  { path: 'apps/web/src/hooks/useWebSocket.ts', title: 'useWebSocket Hook' },
  { path: 'apps/web/src/hooks/useOfflineFirst.ts', title: 'useOfflineFirst Hook' },
  { path: 'apps/web/src/db/index.ts', title: 'IndexedDB Config' },
  { path: 'apps/web/src/db/schema.ts', title: 'IndexedDB Schema' },
  { path: 'apps/web/src/db/sync/syncManager.ts', title: 'SyncManager' },
  { path: 'apps/web/src/components/chat/ChatView.tsx', title: 'ChatView Component' },
  { path: 'apps/web/src/components/chat/MessageBubble.tsx', title: 'MessageBubble Component' },
  { path: 'apps/web/src/components/chat/ChatComposer.tsx', title: 'ChatComposer Component' },
  { path: 'apps/web/src/types/index.ts', title: 'Types' },
  { path: 'packages/db/src/schema/messages.ts', title: 'Database Schema' }
];

// Función para leer archivo
function readFile(filePath) {
  try {
    const fullPath = path.join(PROJECT_ROOT, filePath);
    console.log(`Buscando archivo: ${fullPath}`);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`Archivo no encontrado: ${fullPath}`);
      return `// ARCHIVO NO ENCONTRADO: ${filePath}`;
    }
    
    console.log(`Archivo encontrado: ${fullPath}`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    return content;
  } catch (error) {
    console.log(`Error leyendo archivo ${filePath}: ${error.message}`);
    return `// ERROR LEYENDO ARCHIVO ${filePath}: ${error.message}`;
  }
}

// Función para generar el documento
function generateAuditDocument() {
  let document = '';
  
  // Encabezado simple
  document += '# AUDITORÍA TÉCNICA DEL SISTEMA DE MENSAJES\n\n';
  document += `**Fecha:** ${new Date().toISOString()}\n`;
  document += `**Proyecto:** FluxCoreChat\n`;
  document += `**Total de archivos analizados:** ${MESSAGE_FILES.length}\n\n`;
  
  // Contenido de cada archivo - solo código
  MESSAGE_FILES.forEach((file, index) => {
    document += `## ${index + 1}. ${file.title}\n\n`;
    document += `**Archivo:** \`${file.path}\`\n\n`;
    document += `**Código:**\n\n`;
    document += '```typescript\n';
    document += readFile(file.path);
    document += '\n```\n\n';
  });
  
  // Estructuras de Base de Datos
  document += '## ESTRUCTURAS DE BASE DE DATOS\n\n';
  
  // PostgreSQL Schema
  document += '### PostgreSQL - Tabla messages\n\n';
  document += '```sql\n';
  document += '-- Obtener estructura de la tabla messages\n';
  document += '\\d messages\n';
  document += '\n```\n\n';
  
  document += '```sql\n';
  document += '-- Schema completo de la tabla messages\n';
  document += 'SELECT column_name, data_type, is_nullable, column_default\n';
  document += 'FROM information_schema.columns\n';
  document += 'WHERE table_name = \'messages\'\n';
  document += 'ORDER BY ordinal_position;\n';
  document += '\n```\n\n';
  
  // PostgreSQL - Datos de ejemplo
  document += '### PostgreSQL - Datos de Ejemplo\n\n';
  document += '```sql\n';
  document += '-- Consultar mensajes recientes\n';
  document += 'SELECT id, conversation_id, sender_account_id, content, type, generated_by, created_at, updated_at\n';
  document += 'FROM messages\n';
  document += 'WHERE conversation_id = \'51b841be-1830-4d17-a354-af7f03bee332\'\n';
  document += 'ORDER BY created_at DESC\n';
  document += 'LIMIT 10;\n';
  document += '\n```\n\n';
  
  // IndexedDB Schema
  document += '### IndexedDB - Estructura Local\n\n';
  document += '```typescript\n';
  document += '// apps/web/src/db/schema.ts - Schema completo\n';
  document += 'export interface LocalMessage {\n';
  document += '  id: string;\n';
  document += '  conversationId: string;\n';
  document += '  senderAccountId: string;\n';
  document += '  content: MessageContent;\n';
  document += '  type: \'incoming\' | \'outgoing\' | \'system\';\n';
  document += '  syncState: SyncState;\n';
  document += '  pendingOperation?: PendingOperation;\n';
  document += '  localCreatedAt: Date;\n';
  document += '  serverCreatedAt?: Date;\n';
  document += '  status?: \'local_only\' | \'pending_backend\' | \'synced\' | \'sent\' | \'delivered\' | \'seen\';\n';
  document += '  fromActorId?: string;\n';
  document += '  toActorId?: string;\n';
  document += '  generatedBy?: \'human\' | \'ai\' | \'system\';\n';
  document += '}\n';
  document += '\n```\`\n\n';
  
  document += '```typescript\n';
  document += '// Estados de sincronización\n';
  document += 'export type SyncState = \n';
  document += '  | \'local_only\'\n';
  document += '  | \'pending_backend\'\n';
  document += '  | \'synced\'\n';
  document += '  | \'conflict\'\n';
  document += '  | \'error\';\n';
  document += '\n```\`\n\n';
  
  // IndexedDB - Configuración
  document += '```typescript\n';
  document += '// apps/web/src/db/index.ts - Configuración de IndexedDB\n';
  document += 'export class FluxCoreDB extends Dexie {\n';
  document += '  messages!: Table<LocalMessage, string>;\n';
  document += '  conversations!: Table<LocalConversation, string>;\n';
  document += '  relationships!: Table<LocalRelationship, string>;\n';
  document += '  syncQueue!: Table<SyncQueueItem, string>;\n\n';
  document += '  constructor(accountId?: string) {\n';
  document += '    const dbName = accountId ? `FluxCoreDB_${accountId}` : \'FluxCoreDB\';\n';
  document += '    super(dbName);\n\n';
  document += '    this.version(1).stores({\n';
  document += '      messages: \'id, conversationId, senderAccountId, syncState, localCreatedAt, [conversationId+localCreatedAt]\',\n';
  document += '      conversations: \'id, relationshipId, syncState, lastMessageAt\',\n';
  document += '      relationships: \'id, accountAId, accountBId, syncState\',\n';
  document += '      syncQueue: \'id, entityType, entityId, operation, status, createdAt\'\n';
  document += '    });\n';
  document += '  }\n';
  document += '}\n';
  document += '\n```\`\n\n';
  
  // Ejemplos de datos IndexedDB
  document += '### IndexedDB - Datos de Ejemplo\n\n';
  document += '```javascript\n';
  document += '// Consultar mensajes en IndexedDB desde consola del navegador\n';
  document += 'async function getIndexedDBMessages() {\n';
  document += '  const databases = await indexedDB.databases();\n';
  document += '  const fluxCoreDBs = databases.filter(db => db.name && db.name.startsWith(\'FluxCoreDB_\'));\n\n';
  document += '  console.log(\'Bases de datos FluxCore encontradas:\', fluxCoreDBs.map(db => db.name));\n\n';
  document += '  const allMessages = [];\n\n';
  document += '  for (const dbInfo of fluxCoreDBs) {\n';
  document += '    const dbName = dbInfo.name;\n';
  document += '    console.log(`Verificando DB: ${dbName}`);\n\n';
  document += '    const db = await new Promise((resolve, reject) => {\n';
  document += '      const request = indexedDB.open(dbName);\n';
  document += '      request.onsuccess = () => resolve(request.result);\n';
  document += '      request.onerror = () => reject(request.error);\n';
  document += '    });\n\n';
  document += '    const messages = await new Promise((resolve, reject) => {\n';
  document += '      const transaction = db.transaction([\'messages\'], \'readonly\');\n';
  document += '      const store = transaction.objectStore(\'messages\');\n';
  document += '      const request = store.getAll();\n';
  document += '      request.onsuccess = () => resolve(request.result);\n';
  document += '      request.onerror = () => reject(request.error);\n';
  document += '    });\n\n';
  document += '    allMessages.push({\n';
  document += '      dbName,\n';
  document += '      accountId: dbName.replace(\'FluxCoreDB_\', \'\'),\n';
  document += '      messages: messages,\n';
  document += '      count: messages.length\n';
  document += '    });\n\n';
  document += '    db.close();\n';
  document += '  }\n\n';
  document += '  return allMessages;\n';
  document += '}\n';
  document += '\n```\`\n\n';
  
  return document;
}

// Generar el documento
try {
  const auditContent = generateAuditDocument();
  fs.writeFileSync(OUTPUT_FILE, auditContent, 'utf-8');
  
  console.log('✅ AUDITORÍA TÉCNICA GENERADA');
  console.log(`📄 Archivo: ${OUTPUT_FILE}`);
  console.log(`📊 Archivos analizados: ${MESSAGE_FILES.length}`);
  console.log(`📏 Tamaño: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);
  
  // Mostrar resumen
  console.log('\n📋 Resumen de archivos incluidos:');
  MESSAGE_FILES.forEach((file, index) => {
    const exists = fs.existsSync(path.join(PROJECT_ROOT, file.path));
    console.log(`   ${index + 1}. ${exists ? '✅' : '❌'} ${file.title}`);
    console.log(`      ${file.path}`);
  });
  
} catch (error) {
  console.error('❌ Error generando auditoría:', error.message);
  process.exit(1);
}
