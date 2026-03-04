import { db, messages } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';

async function checkUIMirror() {
  try {
    console.log('🔍 VERIFICANDO ESPEJO EN UI - ¿PROBLEMA CON ESPACIOS?');
    
    // Obtener los últimos mensajes con espacios
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
    
    console.log(`📊 ANÁLISIS DE ESPACIOS EN MENSAJES:`);
    
    latestMessages.forEach((msg, i) => {
      const text = msg.content?.text || '';
      const hasTrailingSpace = text.endsWith(' ');
      const hasLeadingSpace = text.startsWith(' ');
      const actualLength = text.length;
      const trimmedLength = text.trim().length;
      const spaceCount = actualLength - trimmedLength;
      
      console.log(`${i + 1}. "${text}"`);
      console.log(`   📅 ${msg.createdAt.toISOString()}`);
      console.log(`   👤 ${msg.senderAccountId} (${msg.type})`);
      console.log(`   🔍 Longitud: ${actualLength} chars`);
      console.log(`   🔍 Trimmed: ${trimmedLength} chars`);
      console.log(`   🔍 Espacios: ${spaceCount}`);
      console.log(`   🔍 Espacio inicial: ${hasLeadingSpace}`);
      console.log(`   🔍 Espacio final: ${hasTrailingSpace}`);
      
      if (spaceCount > 0) {
        console.log(`   ⚠️ ¡TIENE ESPACIOS! Esto puede causar el espejo en UI.`);
      }
      console.log('');
    });
    
    // Verificar específicamente los mensajes de la captura
    console.log(`🎯 VERIFICANDO MENSAJES DE LA CAPTURA:`);
    
    const captureMessages = latestMessages.filter(msg => 
      msg.content?.text?.includes('no es verdad') || 
      msg.content?.text?.includes('funiona')
    );
    
    console.log(`📊 Mensajes de la captura encontrados: ${captureMessages.length}`);
    
    captureMessages.forEach((msg, i) => {
      const text = msg.content?.text || '';
      const signature = `${msg.senderAccountId}:${text}::human`;
      const trimmedSignature = `${msg.senderAccountId}:${text.trim()}::human`;
      
      console.log(`${i + 1}. "${text}"`);
      console.log(`   📅 ${msg.createdAt.toISOString()}`);
      console.log(`   👤 ${msg.senderAccountId} (${msg.type})`);
      console.log(`   🆔 ${msg.id}`);
      console.log(`   🔍 Signature: "${signature}"`);
      console.log(`   🔍 Trimmed Sig: "${trimmedSignature}"`);
      
      // Verificar si hay otros mensajes con mismo trimmed text
      const similarMessages = latestMessages.filter(m => 
        m.content?.text?.trim() === text.trim() && m.id !== msg.id
      );
      
      if (similarMessages.length > 0) {
        console.log(`   ❌ TIENE ${similarMessages.length} MENSAJES SIMILARES:`);
        similarMessages.forEach(sim => {
          console.log(`      • "${sim.content?.text}" - ID: ${sim.id}`);
        });
      } else {
        console.log(`   ✅ SIN MENSAJES SIMILARES`);
      }
      console.log('');
    });
    
    // Simular el problema de UI
    console.log(`🔍 SIMULANDO EL PROBLEMA DE UI:`);
    
    const testMessage = captureMessages[0];
    if (testMessage) {
      const text = testMessage.content?.text || '';
      const signature = `${testMessage.senderAccountId}:${text}::human`;
      
      console.log(`📋 Mensaje de prueba: "${text}"`);
      console.log(`🔍 Signature: "${signature}"`);
      
      // Simular addReceivedMessage
      console.log(`\n🔄 Simulando addReceivedMessage:`);
      
      // Caso 1: Mensaje optimista con espacio
      const optimisticText = text.trim(); // Sin espacio
      const optimisticId = 'temp-' + Date.now();
      const optimisticSignature = `${testMessage.senderAccountId}:${optimisticText}::human`;
      
      console.log(`1. Mensaje optimista: "${optimisticText}"`);
      console.log(`   Signature: "${optimisticSignature}"`);
      
      // Caso 2: Mensaje real con espacio
      const realSignature = signature;
      
      console.log(`2. Mensaje real: "${text}"`);
      console.log(`   Signature: "${realSignature}"`);
      
      if (optimisticSignature !== realSignature) {
        console.log(`\n❌ ¡LAS FIRMAS NO COINCIDEN!`);
        console.log(`   Optimista: "${optimisticSignature}"`);
        console.log(`   Real: "${realSignature}"`);
        console.log(`   🚨 Esto causa que el mensaje optimista no se reemplace`);
        console.log(`   🚨 Y ambos mensajes aparezcan en la UI`);
      } else {
        console.log(`\n✅ Las firman coinciden, no debería haber espejo`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error verificando espejo UI:', error);
  } finally {
    process.exit(0);
  }
}

checkUIMirror().catch(console.error);
