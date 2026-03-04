#!/usr/bin/env bun

/**
 * 🔍 MONITOR EN TIEMPO REAL DE ERRORES DE FIRMA
 * 
 * Espera y captura el próximo error de firma para análisis inmediato
 */

import { db, sql } from '@fluxcore/db';

async function monitorRealtimeSignature() {
    console.log('\n🔍 MONITOR EN TIEMPO REAL DE ERRORES DE FIRMA');
    console.log('📋 Esperando próximo error de firma...\n');
    
    let lastCheck = new Date();
    
    const checkInterval = setInterval(async () => {
        try {
            // Buscar nuevos mensajes con errores de firma desde la última verificación
            const newErrors = await db.execute(sql`
                SELECT 
                    id,
                    message_id,
                    status,
                    payload,
                    last_error,
                    created_at,
                    attempts
                FROM chatcore_outbox
                WHERE last_error ILIKE '%signature%'
                AND created_at > ${lastCheck}
                ORDER BY created_at DESC
                LIMIT 5
            `);
            
            if (newErrors.length > 0) {
                console.log(`\n❌ NUEVO ERROR DE FIRMA DETECTADO (${new Date().toISOString()}):`);
                console.table(newErrors);
                
                // Analizar el primer error
                const error = newErrors[0];
                console.log(`\n🔍 ANÁLISIS DETALLADO DEL ERROR ${error.message_id}:`);
                
                try {
                    const payload = JSON.parse(error.payload || '{}');
                    console.log('📋 PAYLOAD COMPLETO:', JSON.stringify(payload, null, 2));
                    
                    if (payload.certifiedBy) {
                        console.log('\n📋 INFORMACIÓN DEL CERTIFICADOR:');
                        console.log(`  Adapter ID: ${payload.certifiedBy.adapterId}`);
                        console.log(`  Adapter Version: ${payload.certifiedBy.adapterVersion}`);
                        console.log(`  Signature: ${payload.certifiedBy.signature}`);
                        console.log(`  Error: ${error.last_error}`);
                        
                        // Buscar el adapter en DB
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
                            console.log('\n✅ ADAPTER ENCONTRADO:');
                            console.table(adapters);
                            
                            // Intentar recrear la firma
                            const adapter = adapters[0];
                            const crypto = require('node:crypto');
                            
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
                            
                            console.log(`\n🔐 ANÁLISIS DE FIRMA:`);
                            console.log(`  Firma esperada: ${expectedSignature}`);
                            console.log(`  Firma recibida: ${payload.certifiedBy.signature}`);
                            console.log(`  ¿Coinciden?: ${expectedSignature === payload.certifiedBy.signature ? '✅ SÍ' : '❌ NO'}`);
                            
                            if (expectedSignature !== payload.certifiedBy.signature) {
                                console.log('\n🔍 DIFERENCIAS ENCONTRADAS:');
                                console.log('  Posibles causas:');
                                console.log('  1. Payload modificado después de firmar');
                                console.log('  2. Canonicalización diferente');
                                console.log('  3. Signing secret incorrecto');
                                console.log('  4. Adapter ID incorrecto');
                                
                                // Mostrar diferencias específicas
                                console.log('\n📋 COMPARACIÓN DE PAYLOADS:');
                                console.log('  Canonicalizado esperado:');
                                console.log(canonicalPayload);
                                
                                console.log('\n  Payload recibido:');
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
                
                // Actualizar última verificación
                lastCheck = new Date();
            }
            
        } catch (error) {
            console.error('❌ Error en monitor:', error);
        }
    }, 1000); // Verificar cada segundo
    
    // Detener después de 60 segundos
    setTimeout(() => {
        clearInterval(checkInterval);
        console.log('\n⏰ Monitor detenido después de 60 segundos');
        console.log('🎯 Si no hubo errores, el sistema está funcionando correctamente\n');
    }, 60000);
    
    console.log('📋 Monitor activo por 60 segundos...');
    console.log('💡 Envía un mensaje que pueda causar el error para capturarlo');
}

// Ejecutar monitor
monitorRealtimeSignature().catch(console.error);
