import { db, messages } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function checkMessageList() {
  try {
    console.log('🔍 VERIFICANDO LISTA COMPLETA DE MENSAJES...');
    
    // Obtener TODOS los mensajes de la conversación
    const allMessages = await db
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
      .orderBy(desc(messages.createdAt));
    
    console.log(`📊 TOTAL DE MENSAJES EN CONVERSACIÓN: ${allMessages.length}`);
    
    // Agrupar por texto para ver duplicados
    const textGroups = new Map<string, typeof allMessages>();
    
    allMessages.forEach(msg => {
      const text = (msg.content as any)?.text || 'SIN TEXTO';
      if (!textGroups.has(text)) {
        textGroups.set(text, []);
      }
      textGroups.get(text)!.push(msg);
    });
    
    console.log(`\n📊 ANÁLISIS DE DUPLICADOS POR TEXTO:`);
    
    let hasDuplicates = false;
    
    textGroups.forEach((msgs, text) => {
      if (msgs.length > 1) {
        hasDuplicates = true;
        console.log(`\n❌ DUPLICADO ENCONTRADO: "${text}" (${msgs.length} veces)`);
        msgs.forEach((msg, i) => {
          console.log(`   ${i + 1}. ID: ${msg.id}`);
          console.log(`      Emisor: ${msg.senderAccountId}`);
          console.log(`      Tipo: ${msg.type}`);
          console.log(`      Fecha: ${msg.createdAt.toISOString()}`);
          console.log(`      Contenido: ${JSON.stringify(msg.content)}`);
        });
      } else {
        console.log(`✅ "${text}" - 1 vez`);
      }
    });
    
    // Verificar específicamente el mensaje "hola"
    const holaMessages = allMessages.filter(msg => 
      (msg.content as any)?.text?.toLowerCase().trim() === 'hola'
    );
    
    console.log(`\n🎯 ANÁLISIS ESPECÍFICO DEL MENSAJE "hola":`);
    console.log(`📊 Total de mensajes "hola": ${holaMessages.length}`);
    
    holaMessages.forEach((msg, i) => {
      console.log(`${i + 1}. ID: ${msg.id}`);
      console.log(`   Emisor: ${msg.senderAccountId}`);
      console.log(`   Tipo: ${msg.type}`);
      console.log(`   Fecha: ${msg.createdAt.toISOString()}`);
      console.log(`   Contenido: ${JSON.stringify(msg.content)}`);
    });
    
    // Verificar si hay IDs duplicados
    const messageIds = allMessages.map(msg => msg.id);
    const uniqueIds = new Set(messageIds);
    
    if (messageIds.length !== uniqueIds.size) {
      console.log(`\n❌ ¡IDS DUPLICADOS ENCONTRADOS!`);
      console.log(`   Total IDs: ${messageIds.length}`);
      console.log(`   IDs únicos: ${uniqueIds.size}`);
      
      // Encontrar duplicados
      const idCounts = new Map<string, number>();
      messageIds.forEach(id => {
        idCounts.set(id, (idCounts.get(id) || 0) + 1);
      });
      
      idCounts.forEach((count, id) => {
        if (count > 1) {
          console.log(`   ❌ ID ${id} aparece ${count} veces`);
        }
      });
    } else {
      console.log(`\n✅ No hay IDs duplicados`);
    }
    
    // Resumen final
    console.log(`\n📊 RESUMEN FINAL:`);
    console.log(`   • Total mensajes: ${allMessages.length}`);
    console.log(`   • Textos únicos: ${textGroups.size}`);
    console.log(`   • Mensajes "hola": ${holaMessages.length}`);
    console.log(`   • Hay duplicados: ${hasDuplicates ? '❌ SÍ' : '✅ NO'}`);
    
  } catch (error) {
    console.error('❌ Error verificando lista de mensajes:', error);
  } finally {
    process.exit(0);
  }
}

checkMessageList().catch(console.error);
