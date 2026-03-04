#!/usr/bin/env bun

/**
 * 🔍 DIAGNÓSTICO DETALLADO DE FALLAS DE FIRMA
 * 
 * Analiza el mensaje específico que falló para entender por qué
 */

import { db, sql } from '@fluxcore/db';

async function debugSignatureFailure() {
    console.log('\n🔍 DIAGNÓSTICO DETALLADO DE FALLA DE FIRMA\n');
    
    try {
        // 1. Buscar el mensaje específico que falló
        console.log('📋 BUSCANDO MENSAJE CON ERROR DE FIRMA...');
        
        const failedMessages = await db.execute(sql`
            SELECT 
                id,
                message_id,
                status,
                payload,
                last_error,
                created_at,
                attempts
            FROM chatcore_outbox
            WHERE last_error ILIKE '%rreality adapter signature%'
            ORDER BY created_at DESC
            LIMIT 3
        `);
        
        if (failedMessages.length === 0) {
            console.log('✅ No hay mensajes con error "rreality adapter signature"');
            
            // Buscar mensajes con cualquier error de firma
            const anySignatureErrors = await db.execute(sql`
                SELECT 
                    id,
                    message_id,
                    status,
                    last_error,
                    created_at,
                    attempts
                FROM chatcore_outbox
                WHERE last_error ILIKE '%signature%'
                ORDER BY created_at DESC
                LIMIT 3
            `);
            
            if (anySignatureErrors.length > 0) {
                console.log('📊 MENSAJES CON ERRORES DE FIRMA:');
                console.table(anySignatureErrors);
                
                // Analizar el payload del primer mensaje
                const firstError = anySignatureErrors[0];
                console.log(`\n🔍 ANALIZANDO PAYLOAD DEL MENSAJE ${firstError.message_id}:`);
                
                try {
                    const payload = JSON.parse(firstError.last_error || '{}');
                    console.log('Payload:', JSON.stringify(payload, null, 2));
                } catch (e) {
                    console.log('Error parsing payload:', e);
                }
            }
        } else {
            console.log('❌ MENSAJES CON ERROR "RREALITY ADAPTER SIGNATURE":');
            console.table(failedMessages);
            
            // Analizar el payload del primer mensaje
            const firstFailed = failedMessages[0];
            console.log(`\n🔍 ANALIZANDO PAYLOAD DEL MENSAJE ${firstFailed.message_id}:`);
            
            try {
                const payload = JSON.parse(firstFailed.payload || '{}');
                console.log('Payload completo:', JSON.stringify(payload, null, 2));
                
                // Extraer información del adapter
                if (payload.certifiedBy) {
                    console.log('\n📋 INFORMACIÓN DEL CERTIFICADOR:');
                    console.log(`  Adapter ID: ${payload.certifiedBy.adapterId}`);
                    console.log(`  Adapter Version: ${payload.certifiedBy.adapterVersion}`);
                    console.log(`  Signature: ${payload.certifiedBy.signature}`);
                    
                    // Verificar si coincide con algún adapter registrado
                    const adapters = await db.execute(sql`
                        SELECT 
                            adapter_id,
                            driver_id,
                            adapter_class,
                            signing_secret,
                            adapter_version
                        FROM fluxcore_reality_adapters
                        WHERE adapter_id = ${payload.certifiedBy.adapterId}
                    `);
                    
                    if (adapters.length > 0) {
                        console.log('\n✅ ADAPTER ENCONTRADO EN DB:');
                        console.table(adapters);
                        
                        // Intentar recrear la firma
                        const adapter = adapters[0];
                        console.log('\n🔍 INTENTANDO RECREAR FIRMA...');
                        
                        // Importar funciones de firma
                        const crypto = require('node:crypto');
                        
                        // Canonicalizar el payload (similar al kernel)
                        const canonicalPayload = JSON.stringify({
                            factType: payload.factType,
                            source: payload.source,
                            subject: payload.subject || null,
                            object: payload.object || null,
                            evidence: payload.evidence,
                            adapterId: payload.certifiedBy.adapterId,
                            adapterVersion: payload.certifiedBy.adapterVersion,
                        });
                        
                        const expectedSignature = crypto
                            .createHmac('sha256', adapter.signing_secret)
                            .update(canonicalPayload)
                            .digest('hex');
                        
                        console.log(`\n🔐 COMPARACIÓN DE FIRMAS:`);
                        console.log(`  Firma esperada: ${expectedSignature}`);
                        console.log(`  Firma recibida: ${payload.certifiedBy.signature}`);
                        console.log(`  ¿Coinciden?: ${expectedSignature === payload.certifiedBy.signature ? '✅ SÍ' : '❌ NO'}`);
                        
                        if (expectedSignature !== payload.certifiedBy.signature) {
                            console.log('\n🔍 ANÁLISIS DE DIFERENCIAS:');
                            console.log('  Posibles causas:');
                            console.log('  1. El payload fue modificado después de firmar');
                            console.log('  2. La canonicalización es diferente');
                            console.log('  3. El signing secret es diferente');
                            console.log('  4. El adapter ID no coincide');
                            
                            // Verificar si hay diferencias en el payload
                            console.log('\n📋 PAYLOAD CANONICALIZADO ESPERADO:');
                            console.log(canonicalPayload);
                            
                            console.log('\n📋 PAYLOAD RECIBIDO:');
                            console.log(JSON.stringify({
                                factType: payload.factType,
                                source: payload.source,
                                subject: payload.subject || null,
                                object: payload.object || null,
                                evidence: payload.evidence,
                                adapterId: payload.certifiedBy.adapterId,
                                adapterVersion: payload.certifiedBy.adapterVersion,
                            }, null, 2));
                        }
                    } else {
                        console.log('\n❌ ADAPTER NO ENCONTRADO EN DB');
                    }
                }
            } catch (e) {
                console.log('Error parsing payload:', e);
            }
        }
        
        // 2. Buscar mensajes recientes que sí funcionaron
        console.log('\n📊 MENSAJES RECIENTES QUE SÍ FUNCIONARON:');
        const recentSuccess = await db.execute(sql`
            SELECT 
                id,
                message_id,
                status,
                created_at,
                sent_at
            FROM chatcore_outbox
            WHERE status = 'sent'
            ORDER BY created_at DESC
            LIMIT 3
        `);
        
        if (recentSuccess.length > 0) {
            console.table(recentSuccess);
        }
        
        // 3. Verificar si hay patrones en los errores
        console.log('\n📈 ESTADÍSTICAS DE ERRORES:');
        const errorStats = await db.execute(sql`
            SELECT 
                last_error,
                COUNT(*) as count,
                MAX(created_at) as last_occurrence
            FROM chatcore_outbox
            WHERE last_error IS NOT NULL
            GROUP BY last_error
            ORDER BY count DESC
        `);
        
        if (errorStats.length > 0) {
            console.table(errorStats);
        }
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
    }
    
    console.log('\n🎯 DIAGNÓSTICO COMPLETADO\n');
}

// Ejecutar diagnóstico
debugSignatureFailure().catch(console.error);
