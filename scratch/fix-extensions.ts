import { db, extensionInstallations } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { extensionService } from '../apps/api/src/services/extension.service';
import { manifestLoader } from '../apps/api/src/services/manifest-loader.service';

/**
 * FIX SCRIPT: Asegura que todas las cuentas tengan las extensiones preinstaladas (FluxCore)
 * Útil para cuentas creadas antes de la unificación.
 */
async function fixAccountInstallations() {
  console.log('🚀 Iniciando reconciliación de instalaciones...');
  
  // 1. Obtener todas las cuentas (usando drizzle directamente para evitar loops de servicios)
  const allAccounts = await db.query.accounts.findMany();
  console.log(`📊 Encontradas ${allAccounts.length} cuentas.`);

  const preinstalled = manifestLoader.getPreinstalledManifests();
  console.log(`📦 Extensiones preinstaladas detectedas: ${preinstalled.map(m => m.id).join(', ')}`);

  for (const account of allAccounts) {
    console.log(`\n🔍 Verificando cuenta: ${account.alias} (${account.id})`);
    
    // Obtener instalaciones actuales
    const current = await extensionService.getInstalled(account.id);
    const installedIds = current.map(i => i.extensionId);

    for (const manifest of preinstalled) {
      if (!installedIds.includes(manifest.id)) {
        console.log(`   ➕ Instalando ${manifest.id}...`);
        try {
          await extensionService.install({
            accountId: account.id,
            extensionId: manifest.id,
            version: manifest.version,
            enabled: false, // Por defecto oculto por consistencia con requerimiento
            config: manifestLoader.getDefaultConfig(manifest.id),
            grantedPermissions: manifest.permissions,
          });
          console.log(`   ✅ ${manifest.id} instalado con éxito.`);
        } catch (err: any) {
          console.error(`   ❌ Error instalando ${manifest.id}:`, err.message);
        }
      } else {
        console.log(`   ok: ${manifest.id} ya está instalada.`);
      }
    }
  }

  console.log('\n✨ Proceso finalizado.');
  process.exit(0);
}

fixAccountInstallations();
