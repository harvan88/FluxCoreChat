#!/usr/bin/env bun

/**
 * 🔍 CAPTURA DE TRAZA EXACTA DEL KERNEL
 * 
 * Intercepta y captura exactamente lo que se entrega al kernel
 * para identificar el error persistente de firma
 */

import { db, sql } from '@fluxcore/db';

// Variable global para almacenar la última traza
let lastKernelTrace: any = null;
let captureActive = false;

async function captureKernelTrace() {
    console.log('\n🔍 CAPTURA DE TRAZA DEL KERNEL ACTIVADA');
    console.log('📋 Esperando mensajes para capturar...\n');
    
    captureActive = true;
    
    // Monitorear mensajes nuevos en tiempo real
    const checkInterval = setInterval(async () => {
        if (!captureActive) {
            clearInterval(checkInterval);
            return;
        }
        
        try {
            // Buscar mensajes recientes que no han sido capturados
            const recentMessages = await db.execute(sql`
                SELECT 
                    id,
                    message_id,
                    payload,
                    status,
                    created_at,
                    attempts,
                    last_error
                FROM chatcore_outbox
                WHERE created_at > NOW() - INTERVAL '10 seconds'
                ORDER BY created_at DESC
                LIMIT 5
            `);
            
            for (const message of recentMessages) {
                if (message.payload && !message.payload.includes('__captured__')) {
                    console.log(`\n🎯 NUEVO MENSAJE CAPTURADO: ${message.message_id}`);
                    console.log(`📋 Timestamp: ${message.created_at}`);
                    console.log(`📋 Status: ${message.status}`);
                    console.log(`📋 Attempts: ${message.attempts}`);
                    
                    try {
                        const payload = JSON.parse(message.payload);
                        console.log('\n📋 PAYLOAD COMPLETO:');
                        console.log(JSON.stringify(payload, null, 2));
                        
                        // Analizar estructura del payload
                        console.log('\n🔍 ANÁLISIS DE ESTRUCTURA:');
                        console.log(`  factType: ${payload.factType}`);
                        console.log(`  source: ${JSON.stringify(payload.source)}`);
                        console.log(`  subject: ${JSON.stringify(payload.subject)}`);
                        console.log(`  object: ${JSON.stringify(payload.object)}`);
                        console.log(`  evidence: ${JSON.stringify(payload.evidence)}`);
                        console.log(`  certifiedBy: ${JSON.stringify(payload.certifiedBy)}`);
                        
                        // Analizar la firma
                        if (payload.certifiedBy) {
                            console.log('\n🔐 ANÁLISIS DE FIRMA:');
                            console.log(`  adapterId: ${payload.certifiedBy.adapterId}`);
                            console.log(`  adapterVersion: ${payload.certifiedBy.adapterVersion}`);
                            console.log(`  signature: ${payload.certifiedBy.signature}`);
                            
                            // Buscar el adapter correspondiente
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
                                const adapter = adapters[0];
                                console.log('\n✅ ADAPTER ENCONTRADO:');
                                console.log(`  driver_id: ${adapter.driver_id}`);
                                console.log(`  adapter_class: ${adapter.adapter_class}`);
                                console.log(`  adapter_version: ${adapter.adapter_version}`);
                                console.log(`  signing_secret: ${adapter.signing_secret}`);
                                
                                // Intentar recrear la firma exactamente como el kernel
                                console.log('\n🔍 RECREANDO FIRMA COMO EL KERNEL:');
                                
                                const crypto = require('node:crypto');
                                
                                // Exactamente la misma canonicalización que el kernel
                                const canonicalPayload = JSON.stringify({
                                    factType: payload.factType,
                                    source: payload.source,
                                    subject: payload.subject || null,
                                    object: payload.object || null,
                                    evidence: payload.evidence,
                                    adapterId: payload.certifiedBy.adapterId,
                                    adapterVersion: payload.certifiedBy.adapterVersion,
                                });
                                
                                console.log('\n📋 PAYLOAD CANONICALIZADO (COMO EL KERNEL):');
                                console.log(canonicalPayload);
                                
                                const expectedSignature = crypto
                                    .createHmac('sha256', adapter.signing_secret)
                                    .update(canonicalPayload)
                                    .digest('hex');
                                
                                console.log(`\n🔐 COMPARACIÓN DE FIRMAS:`);
                                console.log(`  Firma esperada: ${expectedSignature}`);
                                console.log(`  Firma recibida: ${payload.certifiedBy.signature}`);
                                console.log(`  ¿Coinciden?: ${expectedSignature === payload.certifiedBy.signature ? '✅ SÍ' : '❌ NO'}`);
                                
                                if (expectedSignature !== payload.certifiedBy.signature) {
                                    console.log('\n❌ ERROR DE FIRMA DETECTADO:');
                                    console.log('  Posibles causas:');
                                    console.log('  1. Payload modificado después de firmar');
                                    console.log('  2. Canonicalización diferente');
                                    console.log('  3. Signing secret incorrecto');
                                    console.log('  4. Adapter ID incorrecto');
                                    
                                    // Verificar si hay diferencias específicas
                                    console.log('\n🔍 ANÁLISIS DE DIFERENCIAS:');
                                    
                                    // Comparar cada campo individualmente
                                    const receivedFields = {
                                        factType: payload.factType,
                                        source: payload.source,
                                        subject: payload.subject || null,
                                        object: payload.object || null,
                                        evidence: payload.evidence,
                                        adapterId: payload.certifiedBy.adapterId,
                                        adapterVersion: payload.certifiedBy.adapterVersion,
                                    };
                                    
                                    console.log('  Campos recibidos:');
                                    Object.entries(receivedFields).forEach(([key, value]) => {
                                        console.log(`    ${key}: ${JSON.stringify(value)}`);
                                    });
                                    
                                    // Marcar como capturado para evitar duplicados
                                    await db.execute(sql`
                                        UPDATE chatcore_outbox 
                                        SET payload = ${JSON.stringify({...payload, __captured__: true})}
                                        WHERE id = ${message.id}
                                    `);
                                }
                            } else {
                                console.log('\n❌ ADAPTER NO ENCONTRADO');
                            }
                        }
                        
                        // Esperar un momento para ver si hay error
                        setTimeout(async () => {
                            const updatedMessage = await db.execute(sql`
                                SELECT last_error, status, attempts
                                FROM chatcore_outbox
                                WHERE id = ${message.id}
                            `);
                            
                            if (updatedMessage[0]?.last_error) {
                                console.log('\n❌ ERROR DETECTADO DESPUÉS DE LA CAPTURA:');
                                console.log(`  Error: ${updatedMessage[0].last_error}`);
                                console.log(`  Status: ${updatedMessage[0].status}`);
                                console.log(`  Attempts: ${updatedMessage[0].attempts}`);
                                
                                // Analizar el error específico
                                const error = updatedMessage[0].last_error;
                                if (error.includes('rreality adapter signature')) {
                                    console.log('\n🎯 ERROR ESPECÍFICO IDENTIFICADO:');
                                    console.log('  "rreality adapter signature" - typo en el mensaje de error');
                                    console.log('  Esto sugiere que el error está en el código del kernel');
                                    console.log('  No en la validación real de la firma');
                                }
                            }
                        }, 2000);
                        
                    } catch (parseError) {
                        console.log('❌ Error parsing payload:', parseError);
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Error en captura:', error);
        }
    }, 500); // Verificar cada 500ms para mayor precisión
    
    // Detener después de 2 minutos
    setTimeout(() => {
        captureActive = false;
        clearInterval(checkInterval);
        console.log('\n⏰ Captura detenida después de 2 minutos');
        console.log('🎯 Si no se capturaron errores, envía un mensaje ahora\n');
    }, 120000);
    
    console.log('📋 Captura activa por 2 minutos...');
    console.log('💡 Envía un mensaje para capturar la traza exacta');
}

// Ejecutar captura
captureKernelTrace().catch(console.error);
