import { db, messages } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function checkCurrentMessages() {
  try {
    console.log('🔍 VERIFICANDO MENSAJES RECIENTES...');
    
    // Obtener los mensajes más recientes
    const latestMessages = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderAccountId: messages.senderAccountId,
        content: messages.content,
        type: messages.type,
        generatedBy: messages.generatedBy,
        status: messages.status,
        createdAt: messages.createdAt
      })
      .from(messages)
      .where(eq(messages.conversationId, '51b841be-1830-4d17-a354-af7f03bee332'))
      .orderBy(desc(messages.createdAt))
      .limit(10);
    
    console.log(`📊 ÚLTIMOS 10 MENSAJES:`);
    
    if (latestMessages.length === 0) {
      console.log('❌ No hay mensajes en la base de datos');
      return;
    }
    
    // Analizar cada mensaje
    latestMessages.forEach((msg, i) => {
      const text = (msg.content as any)?.text || 'SIN TEXTO';
      const senderId = msg.senderAccountId;
      
      console.log(`${i + 1}. "${text}"`);
      console.log(`   📅 ${msg.createdAt.toISOString()}`);
      console.log(`   👤 Emisor: ${senderId}`);
      console.log(`   🔍 Tipo: ${msg.type}`);
      
      // Identificar qué account es
      let accountName = 'UNKNOWN';
      switch (senderId) {
        case 'a9611c11-70f2-46cd-baef-6afcde715f3a':
          accountName = 'daniel_mkonr9z2 (Daniel Test - PERSONAL)';
          break;
        case 'b7ad9719-ba4e-4553-9b60-410791e106d9':
          accountName = 'gianfranco (BUSINESS)';
          break;
        case '5c59a05b-4b94-4f78-ab14-9a5fdabe2d31':
          accountName = 'patriciachamorro (BUSINESS)';
          break;
        case 'ace5d88a-1a80-4f43-805b-f31184e59595':
          accountName = 'lacasadepapel (BUSINESS)';
          break;
        case '520954df-cd5b-499a-a435-a5c0be4fb4e8':
          accountName = 'prueba2 (BUSINESS)';
          break;
      }
      
      console.log(`   🏷️  Account: ${accountName}`);
      console.log('');
    });
    
    // Contar mensajes por emisor
    const senderCounts = new Map<string, number>();
    
    latestMessages.forEach(msg => {
      const senderId = msg.senderAccountId;
      senderCounts.set(senderId, (senderCounts.get(senderId) || 0) + 1);
    });
    
    console.log(`📊 CONTEO DE MENSAJES POR EMISOR:`);
    senderCounts.forEach((count, senderId) => {
      let accountName = 'UNKNOWN';
      switch (senderId) {
        case 'a9611c11-70f2-46cd-baef-6afcde715f3a':
          accountName = 'daniel_mkonr9z2 (Daniel Test - PERSONAL)';
          break;
        case 'b7ad9719-ba4e-4553-9b60-410791e106d9':
          accountName = 'gianfranco (BUSINESS)';
          break;
        case '5c59a05b-4b94-4f78-ab14-9a5fdabe2d31':
          accountName = 'patriciachamorro (BUSINESS)';
          break;
        case 'ace5d88a-1a80-4f43-805b-f31184e59595':
          accountName = 'lacasadepapel (BUSINESS)';
          break;
        case '520954df-cd5b-499a-a435-a5c0be4fb4e8':
          accountName = 'prueba2 (BUSINESS)';
          break;
      }
      
      console.log(`   • ${accountName}: ${count} mensajes`);
    });
    
  } catch (error) {
    console.error('❌ Error verificando mensajes recientes:', error);
  } finally {
    process.exit(0);
  }
}

checkCurrentMessages().catch(console.error);
