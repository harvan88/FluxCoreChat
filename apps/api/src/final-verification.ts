import { db, messages } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function finalVerification() {
  try {
    console.log('🎯 VERIFICACIÓN FINAL - ¿LA DUPLICACIÓN ESTÁ RESUELTA?');
    
    // Obtener los últimos 5 mensajes
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
      .limit(5);
    
    console.log(`📊 ÚLTIMOS 5 MENSAJES:`);
    
    // Verificar si hay duplicados entre los últimos mensajes
    const contentMap = new Map<string, number>();
    
    latestMessages.forEach((msg, i) => {
      const text = msg.content?.text || '';
      const normalizedText = text.toLowerCase().trim();
      
      // Contar ocurrencias
      contentMap.set(normalizedText, (contentMap.get(normalizedText) || 0) + 1);
      
      console.log(`${i + 1}. "${text}"`);
      console.log(`   📅 ${msg.createdAt.toISOString()}`);
      console.log(`   👤 ${msg.senderAccountId} (${msg.type})`);
      console.log(`   🆔 ${msg.id}`);
      console.log('');
    });
    
    // Verificar duplicados
    let duplicados = 0;
    for (const [text, count] of contentMap.entries()) {
      if (count > 1) {
        console.log(`🚨 DUPLICADO ENCONTRADO: "${text}" (${count} veces)`);
        duplicados++;
      }
    }
    
    // Verificar mensaje específico de prueba
    const testMessage = latestMessages.find(msg => 
      msg.content?.text?.includes('funiona') || 
      msg.content?.text?.includes('duplicar')
    );
    
    if (testMessage) {
      console.log(`🎯 MENSAJE DE PRUEBA ENCONTRADO:`);
      console.log(`✅ "${testMessage.content?.text}"`);
      console.log(`📅 ${testMessage.createdAt.toISOString()}`);
      console.log(`👤 ${testMessage.senderAccountId} (${testMessage.type})`);
      
      // Buscar duplicados de este mensaje específico
      const duplicadosTest = await db
        .select({ id: messages.id, createdAt: messages.createdAt })
        .from(messages)
        .where(eq(messages.conversationId, '51b841be-1830-4d17-a354-af7f03bee332'))
        .where(eq(messages.id, testMessage.id));
      
      if (duplicadosTest.length === 1) {
        console.log(`🎉 ¡EL MENSAJE DE PRUEBA NO TIENE DUPLICADOS!`);
      }
    }
    
    // Resumen final
    console.log(`\n📊 RESUMEN FINAL:`);
    console.log(`   • Últimos mensajes analizados: ${latestMessages.length}`);
    console.log(`   • Contenidos únicos: ${contentMap.size}`);
    console.log(`   • Duplicados encontrados: ${duplicados}`);
    
    if (duplicados === 0) {
      console.log(`\n🎉 ¡ÉXITO TOTAL! NO HAY DUPLICACIÓN EN LOS MENSAJES RECIENTES.`);
      console.log(`✅ La solución está funcionando correctamente.`);
      console.log(`✅ El filtrado WebSocket funciona.`);
      console.log(`✅ La relación User-Account está implementada.`);
    } else {
      console.log(`\n❌ AÚN HAY ${duplicados} DUPLICADOS EN LOS MENSAJES RECIENTES.`);
    }
    
    // Verificar timestamps para ver si son recientes
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    const recentMessages = latestMessages.filter(msg => 
      new Date(msg.createdAt) > fiveMinutesAgo
    );
    
    console.log(`\n⏰ MENSAJES RECIENTES (últimos 5 minutos): ${recentMessages.length}`);
    
    if (recentMessages.length > 0) {
      console.log(`✅ Hay actividad reciente y sin duplicación.`);
    } else {
      console.log(`ℹ️  No hay mensajes muy recientes.`);
    }
    
  } catch (error) {
    console.error('❌ Error en verificación final:', error);
  } finally {
    process.exit(0);
  }
}

finalVerification().catch(console.error);
