#!/usr/bin/env bun

/**
 * 🧹 LIMPIEZA SIMPLE DE BASURA DE DESARROLLO
 * 
 * Limpia solo las tablas que sabemos que existen
 */

import { db, sql } from '@fluxcore/db';

async function cleanupSimple() {
    console.log('\n🧹 LIMPIEZA SIMPLE DE BASURA DE DESARROLLO\n');
    
    try {
        // 1. Limpiar mensajes recientes
        console.log('🗑️ LIMPIANDO MENSAJES RECIENTES...');
        
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
        
        // 3. Verificar estado final
        console.log('\n📊 ESTADO FINAL:');
        
        const messageCount = await db.execute(sql`SELECT COUNT(*) as count FROM messages`);
        const outboxCount = await db.execute(sql`SELECT COUNT(*) as count FROM chatcore_outbox`);
        
        console.log(`📋 Mensajes restantes: ${messageCount[0]?.count || 0}`);
        console.log(`📋 Outbox restantes: ${outboxCount[0]?.count || 0}`);
        
        // 4. Verificar basura reciente
        console.log('\n🔍 VERIFICANDO BASURA RECIENTE...');
        
        const recentMessages = await db.execute(sql`
            SELECT COUNT(*) as count FROM messages 
            WHERE created_at >= NOW() - INTERVAL '1 hour'
        `);
        
        const recentOutbox = await db.execute(sql`
            SELECT COUNT(*) as count FROM chatcore_outbox 
            WHERE created_at >= NOW() - INTERVAL '1 hour'
        `);
        
        if ((recentMessages[0] as any)?.count > 0 || (recentOutbox[0] as any)?.count > 0) {
            console.log('⚠️ Aún hay basura reciente:');
            console.log(`  Mensajes recientes: ${(recentMessages[0] as any)?.count || 0}`);
            console.log(`  Outbox recientes: ${(recentOutbox[0] as any)?.count || 0}`);
        } else {
            console.log('✅ No hay basura reciente');
        }
        
        console.log('\n🎯 LIMPIEZA COMPLETADA - SISTEMA LIMPIO');
        
    } catch (error) {
        console.error('❌ Error en limpieza:', error);
    }
    
    console.log('\n🧹 OPERACIÓN DE LIMPIEZA COMPLETADA\n');
}

// Ejecutar limpieza
cleanupSimple().catch(console.error);
