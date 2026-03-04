#!/usr/bin/env bun

/**
 * 🔍 VERIFICACIÓN DE ADAPTER DRIVER
 * 
 * Revisa qué driver está registrado para cada adapter
 */

import { db, sql } from '@fluxcore/db';

async function checkAdapterDriver() {
    console.log('\n🔍 VERIFICACIÓN DE ADAPTER DRIVER');
    console.log('═══════════════════════════════════════════════════════════');
    
    try {
        // 1. Verificar adapters registrados
        console.log('\n📋 1. ADAPTERS REGISTRADOS:');
        
        const adapters = await db.execute(sql`
            SELECT 
                adapter_id,
                adapter_class,
                driver_id,
                signing_secret,
                adapter_version,
                created_at
            FROM fluxcore_reality_adapters
            ORDER BY adapter_id
        `);
        
        if (adapters.length === 0) {
            console.log('❌ NO HAY ADAPTERS REGISTRADOS');
            return;
        }
        
        console.table(adapters);
        
        // 2. Verificar específicamente el adapter de WhatsApp
        console.log('\n📋 2. ADAPTER WHATSAPP GATEWAY:');
        
        const whatsappAdapter = adapters.find((a: any) => a.adapter_id === 'fluxcore/whatsapp-gateway');
        
        if (whatsappAdapter) {
            console.log('✅ ADAPTER ENCONTRADO:');
            console.log(`  ID: ${whatsappAdapter.adapter_id}`);
            console.log(`  Class: ${whatsappAdapter.adapter_class}`);
            console.log(`  Driver ID: ${whatsappAdapter.driver_id}`);
            console.log(`  Version: ${whatsappAdapter.adapter_version}`);
            console.log(`  Signing Secret: ${whatsappAdapter.signing_secret}`);
            
            // 3. Comparar con lo que usa ChatCoreGateway
            console.log('\n📋 3. COMPARACIÓN CON ChatCoreGateway:');
            console.log(`  ChatCoreGateway usa driver: "chatcore-gateway"`);
            console.log(`  Adapter registrado con driver: "${whatsappAdapter.driver_id}"`);
            console.log(`  ¿Coinciden?: ${whatsappAdapter.driver_id === 'chatcore-gateway' ? '✅' : '❌'}`);
            
            if (whatsappAdapter.driver_id !== 'chatcore-gateway') {
                console.log('\n❌ DRIVER MISMATCH DETECTADO:');
                console.log(`  Expected: "chatcore-gateway"`);
                console.log(`  Actual: "${whatsappAdapter.driver_id}"`);
                console.log(`  Solución: Actualizar driver_id del adapter a "chatcore-gateway"`);
                
                // 4. Opción para corregir
                console.log('\n📋 4. OPCIÓN DE CORRECCIÓN:');
                console.log('¿Quieres actualizar el driver_id del adapter?');
                
                // Actualizar el driver_id
                await db.execute(sql`
                    UPDATE fluxcore_reality_adapters
                    SET driver_id = 'chatcore-gateway'
                    WHERE adapter_id = 'fluxcore/whatsapp-gateway'
                `);
                
                console.log('✅ Driver ID actualizado a "chatcore-gateway"');
                
                // Verificar después de la actualización
                const updatedAdapter = await db.execute(sql`
                    SELECT driver_id FROM fluxcore_reality_adapters
                    WHERE adapter_id = 'fluxcore/whatsapp-gateway'
                `);
                
                console.log(`📋 Nuevo driver_id: ${(updatedAdapter[0] as any)?.driver_id}`);
            }
        } else {
            console.log('❌ ADAPTER fluxcore/whatsapp-gateway NO ENCONTRADO');
            
            // 5. Crear el adapter
            console.log('\n📋 5. CREANDO ADAPTER:');
            
            await db.execute(sql`
                INSERT INTO fluxcore_reality_adapters (
                    adapter_id,
                    adapter_class,
                    driver_id,
                    signing_secret,
                    adapter_version
                ) VALUES (
                    'fluxcore/whatsapp-gateway',
                    'GATEWAY',
                    'chatcore-gateway',
                    'development_signing_secret_wa',
                    '1.0.0'
                )
            `);
            
            console.log('✅ Adapter fluxcore/whatsapp-gateway creado');
        }
        
        // 6. Verificación final
        console.log('\n📋 6. VERIFICACIÓN FINAL:');
        
        const finalAdapters = await db.execute(sql`
            SELECT adapter_id, driver_id, adapter_class
            FROM fluxcore_reality_adapters
            ORDER BY adapter_id
        `);
        
        console.table(finalAdapters);
        
        // 7. Test de validación
        console.log('\n📋 7. TEST DE VALIDACIÓN:');
        
        const testAdapter = finalAdapters.find((a: any) => a.adapter_id === 'fluxcore/whatsapp-gateway');
        
        if (testAdapter && (testAdapter as any).driver_id === 'chatcore-gateway') {
            console.log('✅ VALIDACIÓN PASARÍA:');
            console.log('  Adapter ID: fluxcore/whatsapp-gateway');
            console.log('  Driver ID: chatcore-gateway');
            console.log('  Evidence Driver: chatcore-gateway');
            console.log('  ¿Match?: ✅ SÍ');
        } else {
            console.log('❌ VALIDACIÓN FALLARÍA:');
            console.log('  Driver mismatch persiste');
        }
        
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

// Ejecutar verificación
checkAdapterDriver();
