import { db, sql } from '@fluxcore/db';

/**
 * Script para registrar el ChatCore Gateway en la base de datos
 * Ejecutar con: bun run scripts/bootstrap-chatcore-adapter.ts
 */
async function bootstrapChatCoreAdapter() {
  console.log('🔧 Bootstrapping ChatCore Gateway adapter...');

  try {
    // Eliminar adapter existente si hay
    await db.execute(sql`
      DELETE FROM fluxcore_reality_adapters 
      WHERE adapter_id = 'chatcore-gateway'
    `);

    // Insertar nuevo adapter con configuración correcta
    await db.execute(sql`
      INSERT INTO fluxcore_reality_adapters (
        adapter_id,
        driver_id,
        adapter_class,
        description,
        signing_secret,
        adapter_version,
        created_at
      ) VALUES (
        'chatcore-gateway',
        'chatcore/internal',
        'GATEWAY',
        'ChatCore Gateway - Internal message certification',
        'chatcore-dev-secret-local',
        '1.0.0',
        NOW()
      )
    `);

    console.log('✅ ChatCore Gateway adapter registered successfully');

    // Verificar registro
    const adapters = await db.execute(sql`
      SELECT adapter_id, driver_id, adapter_class, description, adapter_version
      FROM fluxcore_reality_adapters
      WHERE adapter_id = 'chatcore-gateway'
    `);

    console.table(adapters);

  } catch (error) {
    console.error('❌ Error bootstrapping adapter:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  bootstrapChatCoreAdapter()
    .then(() => {
      console.log('\n🎉 ChatCore Gateway adapter bootstrap completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Bootstrap failed:', error);
      process.exit(1);
    });
}

export { bootstrapChatCoreAdapter };
