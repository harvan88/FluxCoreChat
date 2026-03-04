#!/usr/bin/env bun

/**
 * 🧹 LIMPIEZA COMPLETA DE BASURA DE DESARROLLO
 * 
 * Limpia todos los datos de prueba, errores y basura acumulada
 * durante el desarrollo del kernel y outbox
 */

import { db, sql } from '@fluxcore/db';

async function cleanupDevelopmentTrash() {
    console.log('\n🧹 LIMPIEZA COMPLETA DE BASURA DE DESARROLLO\n');
    
    try {
        // 1. Limpiar mensajes recientes (últimas 2 horas)
        console.log('🗑️ LIMPIANDO MENSAJES DE DESARROLLO...');
        
        await db.execute(sql`
            DELETE FROM messages 
            WHERE created_at >= NOW() - INTERVAL '2 hours'
        `);
        
        console.log('✅ Mensajes recientes eliminados');
        
        // 2. Limpiar outbox basura
        console.log('\n🗑️ LIMPIANDO OUTBOX...');
        
        await db.execute(sql`
            DELETE FROM chatcore_outbox 
            WHERE created_at >= NOW() - INTERVAL '2 hours'
        `);
        
        console.log('✅ Outbox entries eliminados');
        
        // 3. Limpiar señales de kernel basura
        console.log('\n🗑️ LIMPIANDO SEÑALES DEL KERNEL...');
        
        await db.execute(sql`
            DELETE FROM fluxcore_signals 
            WHERE created_at >= NOW() - INTERVAL '2 hours'
            AND fact_type = 'chatcore.message.received'
        `);
        
        console.log('✅ Señales del kernel eliminadas');
        
        // 4. Limpiar errores de projector
        console.log('\n🗑️ LIMPIANDO ERRORES DE PROJECTOR...');
        
        await db.execute(sql`
            DELETE FROM fluxcore_projector_errors 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
        `);
        
        console.log('✅ Errores de projector eliminados');
        
        // 5. Limpiar conversaciones de prueba
        console.log('\n🗑️ LIMPIANDO CONVERSACIONES DE PRUEBA...');
        
        await db.execute(sql`
            DELETE FROM conversations 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
        `);
        
        console.log('✅ Conversaciones de prueba eliminadas');
        
        // 6. Limpiar participants huérfanos
        console.log('\n🗑️ LIMPIANDO PARTICIPANTS HUÉRFANOS...');
        
        await db.execute(sql`
            DELETE FROM conversation_participants 
            WHERE conversation_id NOT IN (SELECT id FROM conversations)
        `);
        
        console.log('✅ Participantes huérfanos eliminados');
        
        // 7. Resetear contadores si es necesario
        console.log('\n🔄 RESETEANDO CONTADORES...');
        
        try {
            await db.execute(sql`ALTER SEQUENCE fluxcore_signals_sequence_number_seq RESTART WITH 1`);
            console.log('✅ Secuencia de señales reseteada');
        } catch (e) {
            console.log('⚠️ No se pudo resetear secuencia de señales (puede no existir)');
        }
        
        // 8. Verificar estado final
        console.log('\n📊 ESTADO FINAL DESPUÉS DE LA LIMPIEZA:');
        
        const finalMessages = await db.execute(sql`SELECT COUNT(*) as count FROM messages`);
        const finalOutbox = await db.execute(sql`SELECT COUNT(*) as count FROM chatcore_outbox`);
        const finalSignals = await db.execute(sql`SELECT COUNT(*) as count FROM fluxcore_signals`);
        const finalConversations = await db.execute(sql`SELECT COUNT(*) as count FROM conversations`);
        
        console.log(`📋 Mensajes restantes: ${finalMessages[0]?.count || 0}`);
        console.log(`📋 Outbox restantes: ${finalOutbox[0]?.count || 0}`);
        console.log(`📋 Señales restantes: ${finalSignals[0]?.count || 0}`);
        console.log(`📋 Conversaciones restantes: ${finalConversations[0]?.count || 0}`);
        
        // 9. Verificar que no hay basura reciente
        console.log('\n🔍 VERIFICANDO BASURA RECIENTE...');
        
        const recentTrash = await db.execute(sql`
            SELECT 
                'messages' as table_name,
                COUNT(*) as count
            FROM messages 
            WHERE created_at >= NOW() - INTERVAL '1 hour'
            UNION ALL
            SELECT 
                'chatcore_outbox' as table_name,
                COUNT(*) as count
            FROM chatcore_outbox 
            WHERE created_at >= NOW() - INTERVAL '1 hour'
            UNION ALL
            SELECT 
                'fluxcore_signals' as table_name,
                COUNT(*) as count
            FROM fluxcore_signals 
            WHERE created_at >= NOW() - INTERVAL '1 hour'
        `);
        
        const hasRecentTrash = recentTrash.some((row: any) => row.count > 0);
        
        if (hasRecentTrash) {
            console.log('⚠️ AÚN HAY BASURA RECIENTE:');
            console.table(recentTrash);
        } else {
            console.log('✅ NO HAY BASURA RECIENTE');
        }
        
        console.log('\n🎯 LIMPIEZA COMPLETADA - SISTEMA LIMPIO');
        
    } catch (error) {
        console.error('❌ Error en limpieza:', error);
    }
    
    console.log('\n🧹 OPERACIÓN DE LIMPIEZA COMPLETADA\n');
}

// Ejecutar limpieza
cleanupDevelopmentTrash().catch(console.error);
