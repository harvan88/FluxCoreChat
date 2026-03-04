import { db, messages } from '@fluxcore/db';
import { eq, desc, like } from 'drizzle-orm';

async function checkDuplication() {
  try {
    console.log('🔍 VERIFICANDO DUPLICACIÓN EN BASE DE DATOS...');
    
    // 1. Obtener todos los mensajes de la conversación
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
    
    console.log(`📊 Total de mensajes en conversación: ${allMessages.length}`);
    
    // 2. Agrupar por contenido (texto) para encontrar duplicados
    const messageGroups = new Map<string, any[]>();
    
    allMessages.forEach(msg => {
      const text = msg.content?.text || '';
      const normalizedText = text.toLowerCase().trim();
      
      if (!messageGroups.has(normalizedText)) {
        messageGroups.set(normalizedText, []);
      }
      messageGroups.get(normalizedText).push(msg);
    });
    
    // 3. Identificar duplicados
    let duplicadosEncontrados = 0;
    
    for (const [text, msgs] of messageGroups.entries()) {
      if (msgs.length > 1) {
        console.log(`\n🚨 DUPLICADO ENCONTRADO: "${text}" (${msgs.length} veces)`);
        
        msgs.forEach((msg, i) => {
          console.log(`   ${i + 1}. ID: ${msg.id}`);
          console.log(`      Sender: ${msg.senderAccountId}`);
          console.log(`      Tipo: ${msg.type}`);
          console.log(`      Creado: ${msg.createdAt}`);
          console.log(`      Contenido: ${JSON.stringify(msg.content)}`);
        });
        
        duplicadosEncontrados++;
      } else {
        console.log(`✅ "${text}" - 1 vez (OK)`);
      }
    }
    
    // 4. Resumen
    console.log(`\n📊 RESUMEN:`);
    console.log(`   • Total mensajes: ${allMessages.length}`);
    console.log(`   • Contenidos únicos: ${messageGroups.size}`);
    console.log(`   • Duplicados encontrados: ${duplicadosEncontrados}`);
    
    if (duplicadosEncontrados === 0) {
      console.log(`\n🎉 ¡NO HAY DUPLICACIÓN! Cada mensaje aparece una sola vez.`);
    } else {
      console.log(`\n❌ SE ENCONTRARON ${duplicadosEncontrados} CASOS DE DUPLICACIÓN.`);
    }
    
    // 5. Verificar últimos mensajes específicos
    console.log(`\n🔍 VERIFICANDO MENSAJES RECIENTES ESPECÍFICOS:`);
    
    const recentMessages = allMessages.slice(0, 5);
    recentMessages.forEach((msg, i) => {
      const text = msg.content?.text || '';
      console.log(`${i + 1}. "${text}" - Sender: ${msg.senderAccountId} - Tipo: ${msg.type}`);
      
      // Verificar si hay otro mensaje con mismo texto
      const mismos = allMessages.filter(m => 
        m.content?.text === text && m.id !== msg.id
      );
      
      if (mismos.length > 0) {
        console.log(`   ❌ TIENE ${mismos.length} DUPLICADOS:`);
        mismos.forEach(dup => {
          console.log(`      • ID: ${dup.id} - Sender: ${dup.senderAccountId} - Tipo: ${dup.type}`);
        });
      } else {
        console.log(`   ✅ SIN DUPLICADOS`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error verificando duplicación:', error);
  } finally {
    process.exit(0);
  }
}

checkDuplication().catch(console.error);
