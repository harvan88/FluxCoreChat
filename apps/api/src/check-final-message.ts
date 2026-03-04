import { db, messages } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function checkFinalMessage() {
  try {
    console.log('🎯 VERIFICACIÓN FINAL - ¿EL ESPEJO ESTÁ RESUELTO?');
    
    // Buscar el mensaje más reciente
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
    
    // Buscar el mensaje específico
    const testMessage = latestMessages.find(msg => 
      msg.content?.text?.includes('gran puetas')
    );
    
    if (testMessage) {
      console.log(`🎯 MENSAJE DE PRUEBA ENCONTRADO:`);
      console.log(`✅ "${testMessage.content?.text}"`);
      console.log(`📅 ${testMessage.createdAt.toISOString()}`);
      console.log(`👤 ${testMessage.senderAccountId} (${testMessage.type})`);
      console.log(`🆔 ${testMessage.id}`);
      
      // Buscar duplicados de este mensaje específico
      const duplicadosTest = await db
        .select({ id: messages.id, createdAt: messages.createdAt })
        .from(messages)
        .where(eq(messages.conversationId, '51b841be-1830-4d17-a354-af7f03bee332'))
        .where(eq(messages.id, testMessage.id));
      
      if (duplicadosTest.length === 1) {
        console.log(`🎉 ¡EL MENSAJE DE PRUEBA NO TIENE DUPLICADOS!`);
      } else {
        console.log(`❌ EL MENSAJE DE PRUEBA TIENE ${duplicadosTest.length} DUPLICADOS:`);
        duplicadosTest.forEach((dup, i) => {
          console.log(`   ${i + 1}. ID: ${dup.id} - ${dup.createdAt.toISOString()}`);
        });
      }
      
      // Verificar si hay otros mensajes con mismo texto
      const sameTextMessages = await db
        .select({ id: messages.id, senderAccountId: messages.senderAccountId, createdAt: messages.createdAt })
        .from(messages)
        .where(eq(messages.conversationId, '51b841be-1830-4d17-a354-af7f03bee332'))
        .where(eq(messages.senderAccountId, testMessage.senderAccountId))
        .orderBy(desc(messages.createdAt))
        .limit(10);
      
      console.log(`\n📊 Mensajes del mismo emisor (${testMessage.senderAccountId}):`);
      let sameTextCount = 0;
      sameTextMessages.forEach((msg, i) => {
        const text = msg.content?.text || '';
        if (text.includes('gran puetas')) {
          sameTextCount++;
          console.log(`${i + 1}. "${text}" - ${msg.createdAt.toISOString()} ⚠️ DUPLICADO`);
        } else {
          console.log(`${i + 1}. "${text}" - ${msg.createdAt.toISOString()}`);
        }
      });
      
      if (sameTextCount === 1) {
        console.log(`\n🎉 ¡SOLO UN MENSAJE CON ESE TEXTO!`);
      } else {
        console.log(`\n❌ ${sameTextCount} MENSAJES CON EL MISMO TEXTO`);
      }
      
    } else {
      console.log(`❌ Mensaje de prueba no encontrado en los últimos mensajes`);
    }
    
    // Resumen final
    console.log(`\n📊 RESUMEN FINAL:`);
    console.log(`   • Total mensajes analizados: ${latestMessages.length}`);
    console.log(`   • Mensaje de prueba encontrado: ${testMessage ? '✅' : '❌'}`);
    
    if (testMessage) {
      console.log(`   • Texto: "${testMessage.content?.text}"`);
      console.log(`   • Emisor: ${testMessage.senderAccountId}`);
      console.log(`   • Destinatario: a9611c11-70f2-46cd-baef-6afcde715f3a`);
    }
    
  } catch (error) {
    console.error('❌ Error en verificación final:', error);
  } finally {
    process.exit(0);
  }
}

checkFinalMessage().catch(console.error);
