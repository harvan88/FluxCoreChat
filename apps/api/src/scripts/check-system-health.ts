#!/usr/bin/env bun

/**
 * 🔍 VERIFICACIÓN DE SALUD DEL SISTEMA
 * 
 * Revisa el estado general del sistema después del error temporal
 */

import { db, sql } from '@fluxcore/db';

async function checkSystemHealth() {
    console.log('\n🔍 VERIFICACIÓN DE SALUD DEL SISTEMA\n');
    
    try {
        // 1. Estadísticas de mensajes recientes
        console.log('📊 ESTADÍSTICAS DE MENSAJES RECIENTES (ÚLTIMA HORA):');
        const messageStats = await db.execute(sql`
            SELECT 
                COUNT(*) as total_messages,
                COUNT(CASE WHEN signal_id IS NOT NULL THEN 1 END) as certified_messages,
                COUNT(CASE WHEN signal_id IS NULL THEN 1 END) as uncertified_messages,
                MAX(created_at) as last_message
            FROM messages 
            WHERE created_at >= NOW() - INTERVAL '1 hour'
        `);
        
        console.table(messageStats);
        
        // 2. Estadísticas del outbox
        console.log('\n📊 ESTADÍSTICAS DEL OUTBOX:');
        const outboxStats = await db.execute(sql`
            SELECT 
                status,
                COUNT(*) as count,
                MAX(created_at) as last_created,
                MAX(sent_at) as last_sent
            FROM chatcore_outbox
            GROUP BY status
            ORDER BY count DESC
        `);
        
        console.table(outboxStats);
        
        // 3. Mensajes pendientes
        const pendingMessages = await db.execute(sql`
            SELECT 
                id,
                message_id,
                status,
                attempts,
                created_at,
                last_error
            FROM chatcore_outbox
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT 5
        `);
        
        if (pendingMessages.length > 0) {
            console.log('\n⏳ MENSAJES PENDIENTES:');
            console.table(pendingMessages);
        } else {
            console.log('\n✅ NO HAY MENSAJES PENDIENTES');
        }
        
        // 4. Verificar estado de los adapters
        console.log('\n📊 ESTADO DE LOS ADAPTERS:');
        const adapterStats = await db.execute(sql`
            SELECT 
                adapter_id,
                driver_id,
                adapter_class,
                adapter_version,
                created_at
            FROM fluxcore_reality_adapters
            ORDER BY created_at DESC
        `);
        
        console.table(adapterStats);
        
        // 5. Verificar si hay mensajes huérfanos
        console.log('\n🔍 VERIFICANDO MENSAJES HUÉRFANOS:');
        const orphanedMessages = await db.execute(sql`
            SELECT 
                m.id,
                m.signal_id,
                m.created_at,
                o.id as outbox_id,
                o.status as outbox_status
            FROM messages m
            LEFT JOIN chatcore_outbox o ON m.id = o.message_id
            WHERE m.created_at >= NOW() - INTERVAL '1 hour'
            AND o.id IS NULL
            LIMIT 5
        `);
        
        if (orphanedMessages.length > 0) {
            console.log('⚠️ MENSAJES SIN OUTBOX ENTRY:');
            console.table(orphanedMessages);
        } else {
            console.log('✅ TODOS LOS MENSAJES RECIENTES TIENEN OUTBOX ENTRY');
        }
        
        // 6. Verificar señales huérfanas
        console.log('\n🔍 VERIFICANDO SEÑALES HUÉRFANAS:');
        const orphanedSignals = await db.execute(sql`
            SELECT 
                s.sequence_number,
                s.fact_type,
                s.certified_by_adapter,
                s.created_at,
                m.id as message_id
            FROM fluxcore_signals s
            LEFT JOIN messages m ON s.sequence_number = m.signal_id
            WHERE s.created_at >= NOW() - INTERVAL '1 hour'
            AND m.id IS NULL
            LIMIT 5
        `);
        
        if (orphanedSignals.length > 0) {
            console.log('⚠️ SEÑALES SIN MENSAJE ASOCIADO:');
            console.table(orphanedSignals);
        } else {
            console.log('✅ TODAS LAS SEÑALES RECIENTES TIENEN MENSAJE ASOCIADO');
        }
        
        // 7. Resumen de salud
        console.log('\n🎯 RESUMEN DE SALUD DEL SISTEMA:');
        
        const totalMessages = messageStats[0]?.total_messages || 0;
        const certifiedMessages = messageStats[0]?.certified_messages || 0;
        const certificationRate = totalMessages > 0 ? (certifiedMessages / totalMessages * 100).toFixed(2) : '0';
        
        console.log(`📊 Tasa de certificación: ${certificationRate}%`);
        console.log(`📊 Mensajes totales (1h): ${totalMessages}`);
        console.log(`📊 Mensajes certificados: ${certifiedMessages}`);
        console.log(`📊 Mensajes pendientes: ${pendingMessages.length}`);
        
        if (parseFloat(certificationRate) >= 95) {
            console.log('✅ SISTEMA SALUDABLE - Tasa de certificación >= 95%');
        } else if (parseFloat(certificationRate) >= 80) {
            console.log('⚠️ SISTEMA CON ADVERTENCIAS - Tasa de certificación entre 80-95%');
        } else {
            console.log('❌ SISTEMA CON PROBLEMAS - Tasa de certificación < 80%');
        }
        
    } catch (error) {
        console.error('❌ Error en verificación de salud:', error);
    }
    
    console.log('\n🎯 VERIFICACIÓN COMPLETADA\n');
}

// Ejecutar verificación
checkSystemHealth().catch(console.error);
