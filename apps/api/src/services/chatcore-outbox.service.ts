import { db, sql, chatcoreOutbox, eq } from '@fluxcore/db';
import { chatCoreGateway } from './fluxcore/chatcore-gateway.service';

export interface OutboxMessage {
  messageId: string;
  accountId: string;
  userId: string;
  payload: any;
  meta: {
    ip?: string;
    userAgent?: string;
    clientTimestamp?: string;
    conversationId?: string;
    requestId?: string;
    humanSenderId?: string;
    messageId?: string; // 🔑 Agregar messageId
  };
}

export class ChatCoreOutboxService {
  /**
   * Encola un mensaje para certificación en el Kernel
   * Se ejecuta en la misma transacción que crea el mensaje
   */
  async enqueue(message: OutboxMessage): Promise<void> {
    await db.execute(sql`
      INSERT INTO chatcore_outbox (message_id, status, payload)
      VALUES (${message.messageId}, 'pending', ${JSON.stringify(message)})
    `);
  }

  /**
   * Procesa mensajes pendientes para certificar en el Kernel
   * Usa SKIP LOCKED para evitar procesamiento duplicado
   */
  async processPending(): Promise<void> {
    // Nota: forUpdate() y skipLocked() no están disponibles en Drizzle directamente
    // Usamos una consulta SQL nativa para SKIP LOCKED
    const pending = await db.execute(sql`
      SELECT * FROM chatcore_outbox 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT 10 
      FOR UPDATE SKIP LOCKED
    `);

    for (const item of pending as any[]) {
      try {
        console.log(`[ChatCoreOutbox] ▶️ PROCESSING item.id=${item.id}, message_id=${item.message_id}`);
        console.log(`[ChatCoreOutbox] 📊 ITEM TYPE CHECK:`, {
          id_type: typeof item.id,
          id_value: item.id,
          message_id_type: typeof item.message_id,
          attempts_type: typeof item.attempts,
          attempts_value: item.attempts
        });
        
        // Marcar como processing para evitar doble procesamiento
        await db.execute(sql`
          UPDATE chatcore_outbox 
          SET status = 'processing'
          WHERE id = ${item.id}
        `);
        
        // Certificar en el Kernel
        const payload = JSON.parse(item.payload as string);
        console.log(`[ChatCoreOutbox] 🔍 LEYENDO DE BASE DE DATOS:`);
        console.log(`📋 PAYLOAD COMPLETO:`, JSON.stringify(payload, null, 2));
        console.log(`📋 META DEL PAYLOAD:`, JSON.stringify(payload.meta || {}, null, 2));
        console.log(`📋 CONTENT DEL PAYLOAD:`, JSON.stringify(payload.content || {}, null, 2));
        
        // 🔑 CORRECCIÓN: Extraer el candidate del wrapper del outbox
        const candidate = payload.candidate || payload;
        
        // 🔑 DETENER BUCLE: Verificar si ya fue procesado
        if (payload.__processed__) {
            console.log(`[ChatCoreOutbox] ⚠️ Message ${item.message_id} already processed, skipping`);
            await db.execute(sql`
              UPDATE chatcore_outbox 
              SET status = 'sent', sent_at = NOW()
              WHERE id = ${item.id}
            `);
            continue;
        }
        
        console.log(`[ChatCoreOutbox] 📤 ENVIANDO AL ChatCoreGateway:`);
        console.log(`📋 ACCOUNT ID:`, payload.accountId);
        console.log(`📋 USER ID:`, payload.userId);
        console.log(`📋 PAYLOAD:`, JSON.stringify(payload.content || payload.payload || {}, null, 2));
        console.log(`📋 META:`, JSON.stringify({
            __fromOutbox: true,
            ...payload.meta
        }, null, 2));
        
        const result = await chatCoreGateway.certifyIngress({
            accountId: payload.accountId, // 🔑 CORREGIDO: Usar accountId real del payload
            userId: payload.userId,
            payload: payload.content || payload.payload || {}, // 🔑 CORREGIDO: Pasar content con la verdad del mundo
            meta: {
                __fromOutbox: true, // 🔑 FLAG PARA EVITAR BUCLE
                ...payload.meta
            }
        });
        
        // Marcar como procesado para evitar bucles
        await db.execute(sql`
          UPDATE chatcore_outbox 
          SET payload = ${JSON.stringify({...payload, __processed__: true})}
          WHERE id = ${item.id}
        `);
        
        // Vincular el mensaje con la señal creada
        if (result.accepted && result.signalId) {
          await db.execute(sql`
            UPDATE messages 
            SET signal_id = ${result.signalId}
            WHERE id = ${item.message_id}
          `);
        }
        
        // Marcar como enviado
        await db.execute(sql`
          UPDATE chatcore_outbox 
          SET status = 'sent', sent_at = NOW()
          WHERE id = ${item.id}
        `);
          
        console.log(`[ChatCoreOutbox] ✅ Certified message ${item.message_id}`);
        
      } catch (error) {
        const newAttempts = (item.attempts || 0) + 1;
        const maxRetries = 10;
        
        if (newAttempts >= maxRetries) {
          console.error(`[ChatCoreOutbox] ❌ Max retries exceeded for message ${item.message_id}`);
        }
        
        // Mantener en pending para reintentos
        await db.execute(sql`
          UPDATE chatcore_outbox 
          SET status = 'pending', 
              attempts = ${newAttempts}, 
              last_error = ${error instanceof Error ? error.message : String(error)}
          WHERE id = ${item.id}
        `);
          
        console.error(`[ChatCoreOutbox] ❌ Failed to certify message ${item.message_id}:`, error);
      }
    }
  }

  /**
   * Inicia el worker de procesamiento
   */
  startWorker(): void {
    console.log('[ChatCoreOutbox] 🔄 Starting certification worker...');
    
    setInterval(async () => {
      try {
        await this.processPending();
      } catch (error) {
        console.error('[ChatCoreOutbox] Worker error:', error);
      }
    }, 2000); // Cada 2 segundos
  }

  /**
   * Obtiene estadísticas del outbox
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    sent: number;
    total: number;
  }> {
    const [pending, processing, sent] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(chatcoreOutbox).where(eq(chatcoreOutbox.status, 'pending')),
      db.select({ count: sql<number>`count(*)::int` }).from(chatcoreOutbox).where(eq(chatcoreOutbox.status, 'processing')),
      db.select({ count: sql<number>`count(*)::int` }).from(chatcoreOutbox).where(eq(chatcoreOutbox.status, 'sent'))
    ]);

    return {
      pending: Number(pending[0]?.count || 0),
      processing: Number(processing[0]?.count || 0),
      sent: Number(sent[0]?.count || 0),
      total: Number(pending[0]?.count || 0) + Number(processing[0]?.count || 0) + Number(sent[0]?.count || 0)
    };
  }
}

export const chatCoreOutboxService = new ChatCoreOutboxService();
