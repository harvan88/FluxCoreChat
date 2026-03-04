import { db, messages } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function fixDuplication() {
  try {
    console.log('🔧 ELIMINANDO MENSAJES DUPLICADOS...');
    
    // 1. Obtener todos los mensajes duplicados por contenido
    const allMessages = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderAccountId: messages.senderAccountId,
        content: messages.content,
        type: messages.type,
        generatedBy: messages.generatedBy,
        createdAt: messages.createdAt
      })
      .from(messages)
      .orderBy(desc(messages.createdAt));
    
    // 2. Agrupar por contenido y conversación
    const messageGroups = new Map<string, any[]>();
    
    allMessages.forEach(msg => {
      const text = msg.content?.text || '';
      const key = `${msg.conversationId}:${text}`;
      
      if (!messageGroups.has(key)) {
        messageGroups.set(key, []);
      }
      messageGroups.get(key).push(msg);
    });
    
    // 3. Identificar y eliminar duplicados
    let deletedCount = 0;
    
    for (const [key, msgs] of messageGroups.entries()) {
      if (msgs.length > 1) {
        console.log(`🚨 DUPLICADO ENCONTRADO: "${msgs[0].content?.text}" (${msgs.length} veces)`);
        
        // Mantener el primero (el más antiguo), eliminar el resto
        const toKeep = msgs[0];
        const toDelete = msgs.slice(1);
        
        console.log(`   ✅ Manteniendo: ${toKeep.id} (${toKeep.type}) - ${toKeep.createdAt}`);
        
        for (const msg of toDelete) {
          console.log(`   🗑️ Eliminando: ${msg.id} (${msg.type}) - ${msg.createdAt}`);
          await db.delete(messages).where(eq(messages.id, msg.id));
          deletedCount++;
        }
      }
    }
    
    console.log(`✅ LIMPIEZA COMPLETADA: ${deletedCount} mensajes duplicados eliminados`);
    
    // 4. Verificar resultado
    const remainingMessages = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderAccountId: messages.senderAccountId,
        content: messages.content,
        type: messages.type,
        createdAt: messages.createdAt
      })
      .from(messages)
      .orderBy(desc(messages.createdAt))
      .limit(10);
    
    console.log(`📊 QUEDAN ${remainingMessages.length} mensajes recientes:`);
    remainingMessages.forEach((msg, i) => {
      console.log(`   ${i + 1}. ${msg.content?.text} (${msg.type}) - ${msg.senderAccountId}`);
    });
    
  } catch (error) {
    console.error('❌ Error en la limpieza:', error);
  } finally {
    process.exit(0);
  }
}

fixDuplication().catch(console.error);
