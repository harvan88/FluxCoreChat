import { db, sql } from '@fluxcore/db';

/**
 * Servicio de debug paralelo para el outbox
 * Sistema temporal para identificar el problema
 */
export class DebugOutboxDebugger {
  
  /**
   * Procesar un outbox con debug completo
   */
  static async debugProcessOutbox(outboxId: number) {
    console.log(`\n🔍 [DEBUG] Procesando outbox #${outboxId}`);
    
    try {
      // 1. Obtener el outbox
      const outbox = await db.execute(sql`
        SELECT id, message_id, status, created_at, payload
        FROM chatcore_outbox
        WHERE id = ${outboxId}
        LIMIT 1
      `);

      if (outbox.length === 0) {
        console.log(`❌ [DEBUG] Outbox #${outboxId} no encontrado`);
        return;
      }

      const item = outbox[0];
      console.log(`📦 [DEBUG] Outbox encontrado:`);
      console.log(`- ID: ${item.id}`);
      console.log(`- Message ID: ${item.message_id}`);
      console.log(`- Status: ${item.status}`);
      console.log(`- Created: ${item.created_at}`);

      // 2. Parsear payload con debug
      console.log(`\n🔍 [DEBUG] Parseando payload...`);
      let payload;
      try {
        payload = JSON.parse(item.payload);
        console.log(`✅ [DEBUG] Payload parseado correctamente`);
        console.log(`- Type: ${typeof payload}`);
        console.log(`- Keys: ${Object.keys(payload)}`);
        console.log(`- hasAccountId: ${!!payload.accountId}`);
        console.log(`- hasUserId: ${!!payload.userId}`);
        console.log(`- hasPayload: ${!!payload.payload}`);
        console.log(`- hasMeta: ${!!payload.meta}`);
        
        if (payload.meta) {
          console.log(`- meta Type: ${typeof payload.meta}`);
          console.log(`- meta Keys: ${Object.keys(payload.meta)}`);
          console.log(`- meta.messageId: ${payload.meta.messageId}`);
          console.log(`- meta.conversationId: ${payload.meta.conversationId}`);
        }
        
      } catch (error) {
        console.log(`❌ [DEBUG] Error parseando payload: ${error}`);
        console.log(`Raw payload: ${item.payload}`);
        return;
      }

      // 3. Simular llamada a ChatCoreGateway con debug
      console.log(`\n📞 [DEBUG] Llamando a ChatCoreGateway...`);
      
      try {
        const { chatCoreGateway } = await import('./fluxcore/chatcore-gateway.service');
        
        console.log(`🔍 [DEBUG] Parámetros que se pasarán:`);
        console.log(`- accountId: ${payload.accountId} (type: ${typeof payload.accountId})`);
        console.log(`- userId: ${payload.userId} (type: ${typeof payload.userId})`);
        console.log(`- payload: ${payload.payload} (type: ${typeof payload.payload})`);
        console.log(`- meta: ${JSON.stringify(payload.meta)} (type: ${typeof payload.meta})`);
        
        const result = await chatCoreGateway.certifyIngress({
          accountId: payload.accountId,
          userId: payload.userId,
          payload: payload.payload,
          meta: payload.meta
        });

        console.log(`✅ [DEBUG] ChatCoreGateway respondió:`);
        console.log(`- accepted: ${result.accepted}`);
        console.log(`- signalId: ${result.signalId}`);
        console.log(`- reason: ${result.reason}`);

        // 4. Actualizar outbox
        await db.execute(sql`
          UPDATE chatcore_outbox 
          SET status = 'sent', sent_at = NOW() 
          WHERE id = ${outboxId}
        `);

        console.log(`✅ [DEBUG] Outbox actualizado a 'sent'`);

      } catch (error) {
        console.log(`❌ [DEBUG] Error en ChatCoreGateway: ${error}`);
      }

    } catch (error) {
      console.error(`❌ [DEBUG] Error general: ${error}`);
    }
  }

  /**
   * Procesar todos los outbox pendientes
   */
  static async debugProcessAllPending() {
    console.log(`\n🔍 [DEBUG] Procesando todos los outbox pendientes...`);
    
    const pendingOutboxes = await db.execute(sql`
      SELECT id, message_id, status, created_at
      FROM chatcore_outbox
      WHERE status = 'pending'
      ORDER BY created_at
    `);

    console.log(`📊 [DEBUG] Outbox pendientes: ${pendingOutboxes.length}`);

    for (const outbox of pendingOutboxes) {
      await this.debugProcessOutbox(outbox.id);
    }
  }

  /**
   * Verificar el último outbox
   */
  static async debugLastOutbox() {
    console.log(`\n🔍 [DEBUG] Verificando último outbox...`);
    
    const lastOutbox = await db.execute(sql`
      SELECT id, message_id, status, created_at, payload
      FROM chatcore_outbox
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (lastOutbox.length > 0) {
      await this.debugProcessOutbox(lastOutbox[0].id);
    } else {
      console.log(`❌ [DEBUG] No hay outbox`);
    }
  }
}
