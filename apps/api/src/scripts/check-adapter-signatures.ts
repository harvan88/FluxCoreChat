#!/usr/bin/env bun

/**
 * 🔍 VERIFICADOR DE FIRMAS DE ADAPTERS
 * 
 * Diagnostica problemas de firmas inválidas en los adapters
 */

import { db, sql } from '@fluxcore/db';

async function checkAdapterSignatures() {
    console.log('\n🔍 Verificando firmas de adapters...\n');
    
    try {
        // 1. Obtener todos los adapters
        const adapters = await db.execute(sql`
            SELECT 
                adapter_id,
                driver_id,
                adapter_class,
                signing_secret,
                adapter_version,
                created_at
            FROM fluxcore_reality_adapters
            ORDER BY created_at DESC
        `);
        
        console.log('📊 ADAPTERS REGISTRADOS:');
        console.table(adapters);
        
        // 2. Verificar adapters de WhatsApp/Reality
        const whatsappAdapters = adapters.filter(a => 
            a.driver_id.includes('whatsapp') || 
            a.driver_id.includes('reality')
        );
        
        console.log('\n🎯 ADAPTERS DE WHATSAPP/REALITY:');
        if (whatsappAdapters.length === 0) {
            console.warn('⚠️ No se encontraron adapters de WhatsApp/Reality');
        } else {
            console.table(whatsappAdapters);
        }
        
        // 3. Verificar consistencia de signing secrets
        const secrets = adapters.map(a => a.signing_secret);
        const uniqueSecrets = [...new Set(secrets)];
        
        console.log('\n🔐 SIGNING SECRETS:');
        console.log(`Total de secrets: ${secrets.length}`);
        console.log(`Secrets únicos: ${uniqueSecrets.length}`);
        
        if (uniqueSecrets.length > 1) {
            console.warn('⚠️ Hay múltiples signing secrets - esto puede causar problemas');
            uniqueSecrets.forEach((secret, index) => {
                console.log(`  Secret ${index + 1}: ${secret.substring(0, 10)}...`);
            });
        }
        
        // 4. Verificar si hay un adapter con el secret esperado
        const expectedSecret = 'development_signing_secret_wa';
        const matchingAdapter = adapters.find(a => a.signing_secret === expectedSecret);
        
        console.log(`\n🔍 BÚSQUEDA DE SECRET ESPERADO: ${expectedSecret}`);
        if (matchingAdapter) {
            console.log('✅ Adapter encontrado con secret correcto:');
            console.log(`  Driver ID: ${matchingAdapter.driver_id}`);
            console.log(`  Adapter Class: ${matchingAdapter.adapter_class}`);
            console.log(`  Version: ${matchingAdapter.adapter_version}`);
        } else {
            console.warn('❌ No se encontró ningún adapter con el secret esperado');
            console.log('💡 Posibles soluciones:');
            console.log('  1. Ejecutar el bootstrap del adapter');
            console.log('  2. Actualizar el signing_secret en la DB');
            console.log('  3. Verificar que el código use el secret correcto');
        }
        
        // 5. Verificar mensajes recientes con errores de firma
        console.log('\n🔍 VERIFICANDO MENSAJES RECIENTES CON ERRORES...');
        
        const recentErrors = await db.execute(sql`
            SELECT 
                id,
                message_id,
                status,
                last_error,
                created_at,
                attempts
            FROM chatcore_outbox
            WHERE status = 'pending'
            AND last_error ILIKE '%signature%'
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        if (recentErrors.length > 0) {
            console.log('❌ MENSAJES CON ERRORES DE FIRMA:');
            console.table(recentErrors);
        } else {
            console.log('✅ No hay mensajes recientes con errores de firma');
        }
        
    } catch (error) {
        console.error('❌ Error al verificar adapters:', error);
    }
    
    console.log('\n🎯 ANÁLISIS COMPLETADO\n');
}

// Ejecutar verificación
checkAdapterSignatures().catch(console.error);
