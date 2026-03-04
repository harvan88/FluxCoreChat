import { db, messages } from '@fluxcore/db';
import { eq, desc, gte, like } from 'drizzle-orm';

async function checkRecentMessages() {
  try {
    console.log('🔍 VERIFICANDO MENSAJES DESPUÉS DE LA SOLUCIÓN...');
    
    // Verificar mensajes de las últimas 2 horas (después de las 23:00 de ayer)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const recentMessages = await db
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
      .where(gte(messages.createdAt, twoHoursAgo))
      .orderBy(desc(messages.createdAt));
    
    console.log(`📊 Mensajes desde ${twoHoursAgo.toISOString()}: ${recentMessages.length}`);
    
    // Agrupar por contenido para verificar duplicados recientes
    const messageGroups = new Map<string, any[]>();
    
    recentMessages.forEach(msg => {
      const text = msg.content?.text || '';
      const normalizedText = text.toLowerCase().trim();
      
      if (!messageGroups.has(normalizedText)) {
        messageGroups.set(normalizedText, []);
      }
      messageGroups.get(normalizedText).push(msg);
    });
    
    // Verificar duplicados recientes
    let duplicadosRecientes = 0;
    
    console.log('\n🔍 ANÁLISIS DE MENSAJES RECIENTES:');
    
    for (const [text, msgs] of messageGroups.entries()) {
      if (msgs.length > 1) {
        console.log(`🚨 DUPLICADO RECIENTE: "${text}" (${msgs.length} veces)`);
        msgs.forEach((msg, i) => {
          console.log(`   ${i + 1}. ${msg.createdAt.toISOString()} - Sender: ${msg.senderAccountId} - Tipo: ${msg.type}`);
        });
        duplicadosRecientes++;
      } else {
        console.log(`✅ "${text}" - 1 vez (${msgs[0].createdAt.toISOString()})`);
      }
    }
    
    // Verificar específicamente el mensaje "si funiona esto no debe duplicar"
    const testMessage = recentMessages.find(msg => 
      msg.content?.text?.includes('funiona') || 
      msg.content?.text?.includes('duplicar')
    );
    
    if (testMessage) {
      console.log('\n🎯 VERIFICANDO MENSAJE DE PRUEBA:');
      console.log(`✅ "si funiona esto no debe duplicar" encontrado`);
      console.log(`   ID: ${testMessage.id}`);
      console.log(`   Sender: ${testMessage.senderAccountId}`);
      console.log(`   Tipo: ${testMessage.type}`);
      console.log(`   Creado: ${testMessage.createdAt.toISOString()}`);
      
      // Buscar si hay duplicados de este mensaje específico
      const duplicadosTest = await db
        .select({ id: messages.id, senderAccountId: messages.senderAccountId, type: messages.type, createdAt: messages.createdAt })
        .from(messages)
        .where(like(messages.content, '%funiona%'))
        .where(eq(messages.conversationId, '51b841be-1830-4d17-a354-af7f03bee332'));
      
      console.log(`📊 Total de mensajes con "funiona": ${duplicadosTest.length}`);
      
      if (duplicadosTest.length === 1) {
        console.log('🎉 ¡EL MENSAJE DE PRUEBA NO TIENE DUPLICADOS!');
      } else {
        console.log('❌ EL MENSAJE DE PRUEBA TIENE DUPLICADOS:');
        duplicadosTest.forEach((dup, i) => {
          console.log(`   ${i + 1}. ID: ${dup.id} - Sender: ${dup.senderAccountId} - Tipo: ${dup.type}`);
        });
      }
    }
    
    // Resumen final
    console.log(`\n📊 RESUMEN DE MENSAJES RECIENTES:`);
    console.log(`   • Total mensajes (últimas 2h): ${recentMessages.length}`);
    console.log(`   • Contenidos únicos: ${messageGroups.size}`);
    console.log(`   • Duplicados recientes: ${duplicadosRecientes}`);
    
    if (duplicadosRecientes === 0) {
      console.log(`\n🎉 ¡NO HAY DUPLICACIÓN RECIENTE! La solución está funcionando.`);
    } else {
      console.log(`\n❌ AÚN HAY ${duplicadosRecientes} DUPLICADOS RECIENTES.`);
    }
    
  } catch (error) {
    console.error('❌ Error verificando mensajes recientes:', error);
  } finally {
    process.exit(0);
  }
}

checkRecentMessages().catch(console.error);
