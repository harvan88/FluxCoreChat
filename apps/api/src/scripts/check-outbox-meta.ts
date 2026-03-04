#!/usr/bin/env bun

/**
 * 🔍 VERIFICAR META EN OUTBOX
 * 
 * Revisa qué meta se encola y qué se pasa al Gateway
 */

import { db, sql } from '@fluxcore/db';

async function checkOutboxMeta() {
    console.log('\n🔍 VERIFICACIÓN DE META EN OUTBOX');
    console.log('═══════════════════════════════════════════════════════════');
    
    try {
        // 1. Verificar mensajes recientes en outbox
        console.log('\n📋 1. MENSAJES RECIENTES EN OUTBOX:');
        
        const recentOutbox = await db.execute(sql`
            SELECT 
                id,
                message_id,
                status,
                created_at,
                payload::text as payload_text
            FROM chatcore_outbox
            WHERE created_at >= NOW() - INTERVAL '5 minutes'
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        if (recentOutbox.length === 0) {
            console.log('❌ No hay mensajes recientes en outbox');
            return;
        }
        
        console.table(recentOutbox);
        
        // 2. Analizar payload de cada mensaje
        console.log('\n📋 2. ANÁLISIS DE PAYLOADS:');
        
        for (const item of recentOutbox as any[]) {
            console.log(`\n🔍 MENSAJE ${item.id}:`);
            
            try {
                const payload = JSON.parse(item.payload_text);
                
                console.log('📋 ESTRUCTURA DEL PAYLOAD:');
                console.log('  - Tiene candidate:', !!payload.candidate);
                console.log('  - Tiene userId:', !!payload.userId);
                console.log('  - Tiene meta:', !!payload.meta);
                
                if (payload.meta) {
                    console.log('📋 META EN PAYLOAD:');
                    console.log('  Keys:', Object.keys(payload.meta));
                    console.log('  channel:', payload.meta.channel);
                    console.log('  conversationId:', payload.meta.conversationId);
                    console.log('  __fromOutbox:', payload.meta.__fromOutbox);
                }
                
                if (payload.candidate) {
                    console.log('📋 CANDIDATE EN PAYLOAD:');
                    console.log('  - Tiene evidence:', !!payload.candidate.evidence);
                    
                    if (payload.candidate.evidence) {
                        console.log('📋 EVIDENCE EN CANDIDATE:');
                        console.log('  - Tiene raw:', !!payload.candidate.evidence.raw);
                        
                        if (payload.candidate.evidence.raw) {
                            const evidenceRaw = payload.candidate.evidence.raw;
                            console.log('📋 RAW EN EVIDENCE:');
                            console.log('  - Tiene meta:', !!evidenceRaw.meta);
                            
                            if (evidenceRaw.meta) {
                                console.log('📋 META EN EVIDENCE.RAW:');
                                console.log('  Keys:', Object.keys(evidenceRaw.meta));
                                console.log('  channel:', evidenceRaw.meta.channel);
                                console.log('  conversationId:', evidenceRaw.meta.conversationId);
                            }
                        }
                    }
                }
                
            } catch (error: any) {
                console.log('❌ Error parsing payload:', error.message);
            }
        }
        
        // 3. Verificar mensajes originales para comparar
        console.log('\n📋 3. COMPARACIÓN CON MENSAJES ORIGINALES:');
        
        const recentMessages = await db.execute(sql`
            SELECT 
                id,
                conversation_id,
                content::text as content_text,
                meta::text as meta_text,
                created_at
            FROM messages
            WHERE created_at >= NOW() - INTERVAL '5 minutes'
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        if (recentMessages.length > 0) {
            console.log('\n🔍 MENSAJES ORIGINALES:');
            
            for (const msg of recentMessages as any[]) {
                console.log(`\n📋 MENSAJE ${msg.id}:`);
                
                try {
                    const content = JSON.parse(msg.content_text);
                    const meta = JSON.parse(msg.meta_text || '{}');
                    
                    console.log('📋 CONTENT:');
                    console.log('  text:', content.text);
                    
                    console.log('📋 META ORIGINAL:');
                    console.log('  Keys:', Object.keys(meta));
                    console.log('  channel:', meta.channel);
                    console.log('  conversationId:', meta.conversationId);
                    
                } catch (error: any) {
                    console.log('❌ Error parsing message:', error.message);
                }
            }
        }
        
        // 4. Diagnóstico
        console.log('\n🎯 DIAGNÓSTICO:');
        console.log('📋 Si el meta original tiene channel pero el outbox no, el problema está en MessageDispatch');
        console.log('📋 Si el outbox tiene channel pero ChatCoreGateway recibe unknown, el problema está en el outbox worker');
        console.log('📋 Si ninguno tiene channel, el problema está en el input original');
        
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

// Ejecutar verificación
checkOutboxMeta();
