#!/usr/bin/env bun
import { db, fluxcoreSignals, conversations, messages, accounts } from '@fluxcore/db';
import { eq, desc, sql } from 'drizzle-orm';
import { chatCoreWebchatGateway } from '../apps/api/src/services/fluxcore/chatcore-webchat-gateway.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * TEST END-TO-END: Visitor Message → AI Response → DB Persistence → UI Visibility
 * 
 * Flujo esperado:
 * 1. Visitor envía mensaje → WebchatGateway certifica → Signal creado
 * 2. IdentityProjector crea Actor + Address + Link
 * 3. ChatProjector crea Conversation (ownerAccountId + visitorToken, SIN relationshipId)
 * 4. ChatProjector encola en cognition_queue con target_account_id = tenant (owner)
 * 5. CognitionWorker procesa → CognitiveDispatcher resuelve PolicyContext del TENANT
 * 6. PolicyContext.mode = 'auto' → RuntimeGateway → AI genera respuesta
 * 7. ActionExecutor persiste mensaje de IA en DB
 * 8. Mensaje visible en UI (query a messages WHERE conversationId)
 */

async function main() {
    console.log('🧪 TEST END-TO-END: Visitor AI Response\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Setup: Obtener cuenta tenant (cualquiera, ya que todas tienen mode=auto ahora)
    const allAccounts = await db.select().from(accounts).limit(1);
    
    if (allAccounts.length === 0) {
        console.error('❌ No hay cuentas en la DB.');
        process.exit(1);
    }

    const tenant = allAccounts[0];
    const visitorToken = `vtok_test_${Date.now()}`;
    
    console.log('📋 Test Configuration:');
    console.log(`   Tenant: ${tenant.username} (${tenant.id.slice(0, 8)})`);
    console.log(`   Visitor Token: ${visitorToken}`);
    console.log(`   (Asumiendo mode=auto según fix anterior)`);
    console.log('');

    // 2. Visitor envía mensaje
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PASO 1: Visitor envía mensaje');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const messageText = `Hola, necesito ayuda con mi pedido. ¿Puedes asistirme? (Test ${Date.now()})`;
    console.log(`   Mensaje: "${messageText}"`);
    
    const cert = await chatCoreWebchatGateway.certifyIngress({
        visitorToken,
        tenantId: tenant.id,
        payload: { text: messageText },
        meta: { requestId: uuidv4() }
    });

    if (!cert.accepted || !cert.signalId) {
        console.error('   ❌ Failed to certify ingress:', cert.reason);
        process.exit(1);
    }
    
    console.log(`   ✅ Signal certificado: #${cert.signalId}`);
    console.log('');

    // 3. Esperar a que projectors procesen (IdentityProjector + ChatProjector)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PASO 2: Esperando proyección (IdentityProjector + ChatProjector)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2s para proyección

    // 4. Verificar conversación creada
    const [conv] = await db.select()
        .from(conversations)
        .where(eq(conversations.visitorToken, visitorToken))
        .limit(1);

    if (!conv) {
        console.error('   ❌ Conversación NO creada. ChatProjector falló.');
        process.exit(1);
    }

    console.log(`   ✅ Conversación creada: ${conv.id}`);
    console.log(`   Owner: ${conv.ownerAccountId}`);
    console.log(`   Relationship: ${conv.relationshipId || 'NULL (correcto para visitantes)'}`);
    console.log('');

    // 5. Verificar mensaje del visitor en DB
    const visitorMessages = await db.select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt));

    console.log(`   Mensajes en conversación: ${visitorMessages.length}`);
    if (visitorMessages.length === 0) {
        console.error('   ❌ Mensaje del visitor NO persistido.');
        process.exit(1);
    }
    console.log(`   ✅ Mensaje del visitor persistido`);
    console.log('');

    // 6. Esperar respuesta de IA (CognitionWorker + AI)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PASO 3: Esperando respuesta de IA (CognitionWorker puede tardar hasta 30s)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    let aiMessage = null;
    let attempts = 0;
    const maxAttempts = 15; // 15 intentos * 2s = 30s max

    while (attempts < maxAttempts && !aiMessage) {
        attempts++;
        console.log(`   Intento ${attempts}/${maxAttempts}...`);
        
        const allMessages = await db.select()
            .from(messages)
            .where(eq(messages.conversationId, conv.id))
            .orderBy(desc(messages.createdAt));

        aiMessage = allMessages.find(m => m.generatedBy === 'ai');
        
        if (!aiMessage) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2s antes de reintentar
        }
    }

    console.log('');

    if (!aiMessage) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ FALLA: IA NO RESPONDIÓ');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.error('Posibles causas:');
        console.error('  1. CognitionWorker no está corriendo');
        console.error('  2. PolicyContext no se resolvió correctamente');
        console.error('  3. RuntimeGateway falló al invocar el modelo');
        console.error('  4. ActionExecutor no persistió el mensaje');
        console.error('');
        console.error('Verificar logs del servidor para más detalles.');
        process.exit(1);
    }

    // 7. SUCCESS!
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ÉXITO: IA RESPONDIÓ Y MENSAJE PERSISTIDO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const aiContent = (aiMessage.content as any)?.text || '[sin contenido]';
    console.log(`   ID Mensaje: ${aiMessage.id}`);
    console.log(`   Generado por: ${aiMessage.generatedBy}`);
    console.log(`   Contenido: "${aiContent.slice(0, 100)}${aiContent.length > 100 ? '...' : ''}"`);
    console.log(`   Created: ${aiMessage.createdAt}`);
    console.log('');
    console.log('🎉 El flujo end-to-end funciona correctamente.');
    console.log('🎉 Los mensajes son visibles en UI (query: SELECT * FROM messages WHERE conversation_id = ...)');
    console.log('');
}

main().catch(console.error).then(() => process.exit(0));
