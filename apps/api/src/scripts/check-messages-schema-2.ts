#!/usr/bin/env bun

/**
 * 🔍 VERIFICAR ESQUEMA DE MESSAGES
 */

import { db, sql } from '@fluxcore/db';

async function checkMessagesSchema() {
    console.log('\n🔍 VERIFICACIÓN DE ESQUEMA DE MESSAGES');
    console.log('═══════════════════════════════════════════════════════════');
    
    try {
        const columns = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'messages' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 COLUMNAS DE MESSAGES:');
        console.table(columns);
        
        // Verificar mensajes recientes
        const recentMessages = await db.execute(sql`
            SELECT id, conversation_id, content, created_at
            FROM messages
            WHERE created_at >= NOW() - INTERVAL '5 minutes'
            ORDER BY created_at DESC
            LIMIT 3
        `);
        
        console.log('\n📋 MENSAJES RECIENTES:');
        console.table(recentMessages);
        
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

checkMessagesSchema();
