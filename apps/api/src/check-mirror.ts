import { db, messages } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function checkMirrorBug() {
  try {
    console.log('🔍 VERIFICANDO ESPEJO - ¿MENSAJES DUPLICADOS CON ESPACIOS?');
    
    // Obtener los últimos 10 mensajes
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
    
    console.log(`📊 ÚLTIMOS 10 MENSAJES (CON ESPACIOS VISIBLES):`);
    
    // Verificar duplicados con espacios
    const messageGroups = new Map<string, any[]>();
    
    latestMessages.forEach((msg, i) => {
      const text = msg.content?.text || '';
      const normalizedText = text.toLowerCase().trim();
      
      console.log(`${i + 1}. "${text}"`);
      console.log(`   📅 ${msg.createdAt.toISOString()}`);
      console.log(`   👤 ${msg.senderAccountId} (${msg.type})`);
      console.log(`   🆔 ${msg.id}`);
      console.log(`   🔍 Normalizado: "${normalizedText}"`);
      console.log(`   🔍 Longitud: ${text.length} chars`);
      console.log('');
      
      // Agrupar por texto normalizado
      if (!messageGroups.has(normalizedText)) {
        messageGroups.set(normalizedText, []);
      }
      messageGroups.get(normalizedText).push(msg);
    });
    
    // Verificar duplicados
    console.log(`🔍 ANÁLISIS DE DUPLICADOS:`);
    
    let duplicadosEncontrados = 0;
    
    for (const [text, msgs] of messageGroups.entries()) {
      if (msgs.length > 1) {
        console.log(`\n🚨 DUPLICADO ENCONTRADO: "${text}" (${msgs.length} veces)`);
        
        msgs.forEach((msg, i) => {
          const originalText = msg.content?.text || '';
          console.log(`   ${i + 1}. "${originalText}"`);
          console.log(`      📅 ${msg.createdAt.toISOString()}`);
          console.log(`      👤 ${msg.senderAccountId} (${msg.type})`);
          console.log(`      🆔 ${msg.id}`);
          console.log(`      🔍 Chars: ${originalText.length}`);
          
          // Verificar caracteres ocultos
          const charArray = Array.from(originalText);
          const charCodes = charArray.map(c => `${c}(${c.charCodeAt(0)})`);
          console.log(`      🔍 Caracteres: ${charCodes.join(', ')}`);
        });
        
        duplicadosEncontrados++;
      }
    }
    
    // Verificar específicamente los mensajes de la captura
    console.log(`\n🎯 VERIFICANDO MENSAJES DE LA CAPTURA:`);
    
    const captureMessages = latestMessages.filter(msg => 
      msg.content?.text?.includes('no es verdad') || 
      msg.content?.text?.includes('funiona')
    );
    
    console.log(`📊 Mensajes de la captura encontrados: ${captureMessages.length}`);
    
    captureMessages.forEach((msg, i) => {
      const text = msg.content?.text || '';
      console.log(`${i + 1}. "${text}"`);
      console.log(`   📅 ${msg.createdAt.toISOString()}`);
      console.log(`   👤 ${msg.senderAccountId} (${msg.type})`);
      console.log(`   🆔 ${msg.id}`);
      
      // Buscar duplicados exactos
      const exactDuplicates = latestMessages.filter(m => 
        m.content?.text === text && m.id !== msg.id
      );
      
      if (exactDuplicates.length > 0) {
        console.log(`   ❌ TIENE ${exactDuplicates.length} DUPLICADOS EXACTOS:`);
        exactDuplicates.forEach(dup => {
          console.log(`      • ID: ${dup.id} - ${dup.createdAt.toISOString()}`);
        });
      } else {
        console.log(`   ✅ SIN DUPLICADOS EXACTOS`);
      }
      
      // Buscar duplicados con espacios
      const spaceDuplicates = latestMessages.filter(m => 
        m.content?.text?.trim() === text.trim() && m.id !== msg.id
      );
      
      if (spaceDuplicates.length > 0) {
        console.log(`   ❌ TIENE ${spaceDuplicates.length} DUPLICADOS CON ESPACIOS:`);
        spaceDuplicates.forEach(dup => {
          console.log(`      • "${dup.content?.text}" - ID: ${dup.id}`);
        });
      }
    });
    
    // Resumen final
    console.log(`\n📊 RESUMEN FINAL:`);
    console.log(`   • Total mensajes analizados: ${latestMessages.length}`);
    console.log(`   • Contenidos únicos: ${messageGroups.size}`);
    console.log(`   • Duplicados encontrados: ${duplicadosEncontrados}`);
    
    if (duplicadosEncontrados > 0) {
      console.log(`\n❌ ¡EL ESPEJO AÚN EXISTE! HAY ${duplicadosEncontrados} CASOS DE DUPLICACIÓN.`);
      console.log(`🔍 Necesitamos investigar por qué los mensajes se están guardando duplicados.`);
    } else {
      console.log(`\n🎉 ¡NO HAY DUPLICACIÓN!`);
    }
    
  } catch (error) {
    console.error('❌ Error verificando espejo:', error);
  } finally {
    process.exit(0);
  }
}

checkMirrorBug().catch(console.error);
