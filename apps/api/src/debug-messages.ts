import { db, messages } from '@fluxcore/db';
import { desc, eq } from 'drizzle-orm';

async function debugMessages() {
  try {
    console.log('🔍 DEBUG: Últimos 10 mensajes en la base de datos');
    console.log('=' .repeat(80));
    
    const result = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderAccountId: messages.senderAccountId,
        content: messages.content,
        type: messages.type,
        generatedBy: messages.generatedBy,
        createdAt: messages.createdAt,
        status: messages.status
      })
      .from(messages)
      .orderBy(desc(messages.createdAt))
      .limit(10);
    
    console.log(`📊 Encontrados ${result.length} mensajes:`);
    console.log('');
    
    result.forEach((msg, index) => {
      console.log(`${index + 1}. 📋 Mensaje ID: ${msg.id}`);
      console.log(`   💬 Conversación: ${msg.conversationId}`);
      console.log(`   👤 Sender: ${msg.senderAccountId}`);
      console.log(`   📝 Contenido: ${JSON.stringify(msg.content)}`);
      console.log(`   🏷️  Tipo: ${msg.type} | Generado por: ${msg.generatedBy} | Status: ${msg.status}`);
      console.log(`   🕐 Creado: ${msg.createdAt}`);
      console.log('');
    });
    
    // Verificar duplicados por contenido
    console.log('🔍 DEBUG: Verificando posibles duplicados por contenido...');
    const contentGroups = result.reduce((groups, msg) => {
      const text = msg.content?.text || '';
      if (text) {
        if (!groups[text]) {
          groups[text] = [];
        }
        groups[text].push(msg);
      }
      return groups;
    }, {} as Record<string, any[]>);
    
    Object.entries(contentGroups).forEach(([text, msgs]) => {
      if (msgs.length > 1) {
        console.log(`🚨 DUPLICADO ENCONTRADO: "${text}" (${msgs.length} veces)`);
        msgs.forEach((msg, i) => {
          console.log(`   ${i + 1}. ID: ${msg.id} | Sender: ${msg.senderAccountId} | ${msg.createdAt}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error al consultar mensajes:', error);
  } finally {
    process.exit(0);
  }
}

debugMessages().catch(console.error);
