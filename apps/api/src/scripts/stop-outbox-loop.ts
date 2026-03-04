#!/usr/bin/env bun

/**
 * 🛑 DETENER BUCLE INFINITO DEL OUTBOX
 * 
 * Marca todos los mensajes procesados como 'sent' para detener el bucle
 */

import { db, sql } from '@fluxcore/db';

async function stopOutboxLoop() {
    console.log('\n🛑 DETENIENDO BUCLE INFINITO DEL OUTBOX\n');
    
    try {
        // 1. Verificar estado actual
        console.log('📊 ESTADO ACTUAL DEL OUTBOX:');
        const currentStatus = await db.execute(sql`
            SELECT 
                status,
                COUNT(*) as count,
                MAX(created_at) as last_created
            FROM chatcore_outbox
            GROUP BY status
            ORDER BY count DESC
        `);
        
        console.table(currentStatus);
        
        // 2. Marcar todos los 'processing' como 'sent' para detener el bucle
        console.log('\n🔄 MARCANDO MENSAJES PROCESSING COMO SENT...');
        await db.execute(sql`
            UPDATE chatcore_outbox 
            SET status = 'sent', sent_at = NOW()
            WHERE status = 'processing'
        `);
        
        console.log('✅ Mensajes processing marcados como sent');
        
        // 3. Marcar todos los 'pending' con __processed__ como 'sent'
        console.log('\n🔄 MARCANDO MENSAJES PROCESADOS COMO SENT...');
        await db.execute(sql`
            UPDATE chatcore_outbox 
            SET status = 'sent', sent_at = NOW()
            WHERE status = 'pending'
            AND payload::text ILIKE '%__processed__%'
        `);
        
        console.log('✅ Mensajes procesados marcados como sent');
        
        // 4. Verificar estado final
        console.log('\n📊 ESTADO FINAL DEL OUTBOX:');
        const finalStatus = await db.execute(sql`
            SELECT 
                status,
                COUNT(*) as count,
                MAX(created_at) as last_created
            FROM chatcore_outbox
            GROUP BY status
            ORDER BY count DESC
        `);
        
        console.table(finalStatus);
        
        // 5. Verificar mensajes pendientes restantes
        const remainingPending = await db.execute(sql`
            SELECT 
                id,
                message_id,
                status,
                created_at,
                attempts
            FROM chatcore_outbox
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT 5
        `);
        
        if (remainingPending.length > 0) {
            console.log('\n⏳ MENSAJES PENDIENTES RESTANTES:');
            console.table(remainingPending);
        } else {
            console.log('\n✅ NO HAY MENSAJES PENDIENTES');
        }
        
        console.log('\n🎯 BUCLE DETENIDO - OUTBOX ESTABLE');
        
    } catch (error) {
        console.error('❌ Error al detener bucle:', error);
    }
    
    console.log('\n🛑 OPERACIÓN COMPLETADA\n');
}

// Ejecutar detención
stopOutboxLoop().catch(console.error);
