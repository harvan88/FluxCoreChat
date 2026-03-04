import { db, sql } from '@fluxcore/db';

/**
 * 🧪 TEST DE SOBERANÍA - VERIFICACIÓN DEL FIX
 * 
 * Test simple para verificar que la soberanía está preservada:
 * 1. Enviar un mensaje
 * 2. Forzar que el Kernel falle
 * 3. Confirmar que el mensaje sigue en la tabla messages
 */

async function testSovereigntyFix() {
    console.log('🧪 INICIANDO TEST DE SOBERANÍA...');
    
    try {
        // 1. Verificar estado actual
        console.log('\n📊 1. ESTADO ACTUAL:');
        const messagesBefore = await db.execute(sql`
            SELECT COUNT(*) as total FROM messages
        `);
        const signalsBefore = await db.execute(sql`
            SELECT COUNT(*) as total FROM fluxcore_signals
        `);
        
        console.log(`Messages antes: ${messagesBefore[0].total}`);
        console.log(`Señales antes: ${signalsBefore[0].total}`);
        
        // 2. Simular envío de mensaje con Kernel fallido
        console.log('\n🚨 2. SIMULANDO ENVÍO CON KERNEL FALLIDO:');
        
        // Importar el gateway modificado
        const { ChatCoreGatewayService } = await import('../services/fluxcore/chatcore-gateway.service');
        const gateway = new ChatCoreGatewayService();
        
        // Parámetros de prueba
        const testParams = {
            accountId: 'a9611c11-70f2-46cd-baef-6afcde715f3a', // System account
            userId: 'test-user-123',
            payload: 'Mensaje de prueba para verificar soberanía',
            meta: {
                conversationId: 'test-conversation-123',
                requestId: 'test-sovereignty-' + Date.now(),
                forceKernelFailure: true // 🔑 Flag para forzar falla del Kernel
            }
        };
        
        console.log('Enviando mensaje con forceKernelFailure=true...');
        
        // 3. Enviar mensaje (debería persistir pero fallar en Kernel)
        const result = await gateway.certifyIngress(testParams);
        
        console.log('\n📋 3. RESULTADO DE CERTIFICACIÓN:');
        console.log('Accepted:', result.accepted);
        console.log('Signal ID:', result.signalId);
        console.log('Message Persisted:', result.messagePersisted);
        console.log('Kernel Certified:', result.kernelCertified);
        console.log('Reason:', result.reason);
        
        // 4. Verificar estado después del test
        console.log('\n📊 4. ESTADO DESPUÉS DEL TEST:');
        const messagesAfter = await db.execute(sql`
            SELECT COUNT(*) as total FROM messages
        `);
        const signalsAfter = await db.execute(sql`
            SELECT COUNT(*) as total FROM fluxcore_signals
        `);
        
        console.log(`Messages después: ${messagesAfter[0].total}`);
        console.log(`Señales después: ${signalsAfter[0].total}`);
        
        // 5. Verificar mensaje específico
        console.log('\n🔍 5. VERIFICACIÓN DEL MENSAJE ESPECÍFICO:');
        const specificMessage = await db.execute(sql`
            SELECT id, content, signal_id, created_at 
            FROM messages 
            WHERE content LIKE '%Mensaje de prueba para verificar soberanía%'
            ORDER BY created_at DESC
            LIMIT 1
        `);
        
        if (specificMessage.length > 0) {
            const msg = specificMessage[0];
            console.log('✅ Mensaje encontrado:');
            console.log('- ID:', msg.id);
            console.log('- Content:', msg.content);
            console.log('- Signal ID:', msg.signal_id);
            console.log('- Created:', msg.created_at);
            
            // 6. Verificar que NO hay señal asociada
            if (msg.signal_id === null) {
                console.log('✅ SOBERANÍA PRESERVADA: Mensaje existe sin señal en Kernel');
            } else {
                console.log('❌ ERROR: Mensaje tiene señal asociada (no debería)');
            }
        } else {
            console.log('❌ ERROR: Mensaje no encontrado en la base de datos');
        }
        
        // 7. Verificar que no hay señales huérfanas
        console.log('\n🔍 6. VERIFICACIÓN DE SEÑALES HUÉRFANAS:');
        const orphanedSignals = await db.execute(sql`
            SELECT COUNT(*) as total 
            FROM fluxcore_signals s
            LEFT JOIN messages m ON s.sequence_number = m.signal_id
            WHERE m.signal_id IS NULL
            AND s.fact_type = 'chatcore.message.received'
        `);
        
        console.log(`Señales huérfanas: ${orphanedSignals[0].total}`);
        
        // 8. Conclusión
        console.log('\n🎯 7. CONCLUSIÓN:');
        
        if (specificMessage.length > 0 && specificMessage[0].signal_id === null) {
            console.log('✅ SOBERANÍA PRESERVADA - El fix funciona correctamente');
            console.log('✅ ChatCore persiste primero, certifica después');
            console.log('✅ Si el Kernel falla, el mensaje sigue existiendo');
            console.log('✅ No hay rollback en ninguna dirección');
        } else {
            console.log('❌ SOBERANÍA COMPROMETIDA - El fix no funciona');
        }
        
        // 9. Limpieza
        console.log('\n🧹 8. LIMPIEZA:');
        if (specificMessage.length > 0) {
            await db.execute(sql`
                DELETE FROM messages WHERE id = ${specificMessage[0].id}
            `);
            console.log('Mensaje de prueba eliminado');
        }
        
    } catch (error: any) {
        console.error('❌ Error en test de soberanía:', error.message);
        console.error(error.stack);
    }
}

// Ejecutar test
testSovereigntyFix().catch(console.error);
