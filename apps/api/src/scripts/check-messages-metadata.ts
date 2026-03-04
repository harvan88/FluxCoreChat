#!/usr/bin/env bun

/**
 * 🔍 VERIFICAR METADATA DE MESSAGES
 */

import { db, sql } from '@fluxcore/db';

async function checkMessagesMetadata() {
    console.log('\n🔍 VERIFICACIÓN DE METADATA DE MESSAGES');
    console.log('═══════════════════════════════════════════════════════════');
    
    try {
        // Verificar mensajes recientes con metadata
        const recentMessages = await db.execute(sql`
            SELECT 
                id,
                conversation_id,
                content::text as content_text,
                metadata::text as metadata_text,
                created_at
            FROM messages
            WHERE created_at >= NOW() - INTERVAL '5 minutes'
            ORDER BY created_at DESC
            LIMIT 3
        `);
        
        if (recentMessages.length === 0) {
            console.log('❌ No hay mensajes recientes');
            return;
        }
        
        console.log('\n📋 MENSAJES RECIENTES:');
        console.table(recentMessages);
        
        // Analizar metadata
        console.log('\n📋 ANÁLISIS DE METADATA:');
        
        for (const msg of recentMessages as any[]) {
            console.log(`\n🔍 MENSAJE ${msg.id}:`);
            
            try {
                const content = JSON.parse(msg.content_text || '{}');
                const metadata = JSON.parse(msg.metadata_text || '{}');
                
                console.log('📋 CONTENT:');
                console.log('  text:', content.text);
                
                console.log('📋 METADATA:');
                console.log('  Keys:', Object.keys(metadata));
                console.log('  channel:', metadata.channel);
                console.log('  conversationId:', metadata.conversationId);
                console.log('  clientTimestamp:', metadata.clientTimestamp);
                console.log('  ip:', metadata.ip);
                console.log('  userAgent:', metadata.userAgent);
                
            } catch (error: any) {
                console.log('❌ Error parsing:', error.message);
            }
        }
        
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

checkMessagesMetadata();
