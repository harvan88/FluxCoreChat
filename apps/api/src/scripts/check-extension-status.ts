import { db, sql } from '@fluxcore/db';

/**
 * Verificar estado de la extensión para prueba2
 */
async function checkExtensionStatus() {
  console.log('🔍 VERIFICANDO ESTADO DE EXTENSIÓN');

  try {
    // Verificar si la extensión está instalada
    const installation = await db.execute(sql`
      SELECT account_id, extension_id, enabled, updated_at
      FROM extension_installations 
      WHERE account_id = 'e0f9602d-1ca4-417f-a2a2-ab4e257ee53a'
        AND extension_id = '@fluxcore/asistentes'
    `);

    console.log('\n📊 INSTALACIÓN @fluxcore/asistentes:');
    console.table(installation);

    if (installation.length === 0) {
      console.log('\n❌ LA EXTENSIÓN NO ESTÁ INSTALADA');
      console.log('🔧 ESTE ES EL PROBLEMA - El flujo automático no se ejecuta sin la extensión');
      
      // Mostrar qué extensiones sí tiene
      const allInstallations = await db.execute(sql`
        SELECT extension_id, enabled, updated_at
        FROM extension_installations 
        WHERE account_id = 'e0f9602d-1ca4-417f-a2a2-ab4e257ee53a'
      `);

      console.log('\n📊 EXTENSIONES DISPONIBLES:');
      console.table(allInstallations);
      
    } else {
      console.log('\n✅ LA EXTENSIÓN ESTÁ INSTALADA');
      console.log(`- Enabled: ${installation[0].enabled ? '✅' : '❌'}`);
      
      if (!installation[0].enabled) {
        console.log('❌ PERO ESTÁ DESHABILITADA');
      } else {
        console.log('✅ Y ESTÁ HABILITADA');
      }
    }

    console.log('\n🎯 CONCLUSIÓN:');
    console.log('El flujo automático solo se ejecuta en el registro de usuarios (auth.service.ts)');
    console.log('Cuando se crea una cuenta directamente, el flujo no se ejecuta automáticamente');
    console.log('La solución es que el flujo manual funciona perfectamente');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkExtensionStatus().catch(console.error);
