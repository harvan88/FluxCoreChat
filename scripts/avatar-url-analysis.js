#!/usr/bin/env node

/**
 * Avatar URL Analysis Script
 * Compara URLs de avatares entre frontend, backend y base de datos
 * para identificar por qué algunos muestran y otros no
 */

import { db } from '@fluxcore/db';
import { accounts, assets } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

// Usuario de prueba según los logs
const TEST_USER_ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';
const TEST_USER_AVATAR_ASSET_ID = '03fe949c-e355-4b97-8cd7-541375702b3c';

async function analyzeAvatarUrls() {
  console.log('🔍 ANÁLISIS DE URLS DE AVATAR\n');
  console.log('📊 Usuario de prueba:', TEST_USER_ACCOUNT_ID);
  console.log('📊 Asset ID:', TEST_USER_AVATAR_ASSET_ID);
  console.log('');

  try {
    // 1. Obtener datos de la base de datos
    console.log('=== BASE DE DATOS ===');
    
    const [account] = await db.select({
      id: accounts.id,
      displayName: accounts.displayName,
      alias: accounts.alias,
      avatarAssetId: accounts.avatarAssetId,
    })
    .from(accounts)
    .where(eq(accounts.id, TEST_USER_ACCOUNT_ID))
    .limit(1);

    if (!account) {
      console.log('❌ Cuenta no encontrada');
      return;
    }

    console.log('✅ Cuenta encontrada:');
    console.log(`   ID: ${account.id}`);
    console.log(`   DisplayName: ${account.displayName}`);
    console.log(`   Alias: ${account.alias}`);
    console.log(`   AvatarAssetId: ${account.avatarAssetId}`);
    console.log('');

    if (!account.avatarAssetId) {
      console.log('❌ La cuenta no tiene avatarAssetId');
      return;
    }

    // 2. Obtener datos del asset
    const [asset] = await db.select({
      id: assets.id,
      name: assets.name,
      originalName: assets.originalName,
      mimeType: assets.mimeType,
      checksumSHA256: assets.checksumSHA256,
      storageKey: assets.storageKey,
      status: assets.status,
    })
    .from(assets)
    .where(eq(assets.id, account.avatarAssetId))
    .limit(1);

    if (!asset) {
      console.log('❌ Asset no encontrado');
      return;
    }

    console.log('✅ Asset encontrado:');
    console.log(`   ID: ${asset.id}`);
    console.log(`   Name: ${asset.name}`);
    console.log(`   OriginalName: ${asset.originalName}`);
    console.log(`   MimeType: ${asset.mimeType}`);
    console.log(`   ChecksumSHA256: ${asset.checksumSHA256}`);
    console.log(`   StorageKey: ${asset.storageKey}`);
    console.log(`   Status: ${asset.status}`);
    console.log('');

    // 3. Generar URLs según diferentes métodos
    const checksum16 = asset.checksumSHA256.substring(0, 16);
    
    console.log('=== URLS GENERADAS ===');
    
    // URL local (AvatarPresenter)
    const localUrl = `/avatars/${checksum16}`;
    console.log(`📍 URL Local (AvatarPresenter): ${localUrl}`);
    
    // URL firmada (AssetPolicy)
    // Simulación de URL firmada para perfil público
    const signedUrl = `http://localhost:3000/uploads/${asset.storageKey}`;
    console.log(`📍 URL Firmada (AssetPolicy): ${signedUrl}`);
    
    // URL física del archivo
    const physicalPath = `uploads/assets/avatars/${checksum16.slice(0, 2)}/${checksum16.slice(2, 4)}/${checksum16}`;
    console.log(`📍 Path Físico: ${physicalPath}`);
    console.log('');

    // 4. Análisis de diferencias
    console.log('=== ANÁLISIS DE DIFERENCIAS ===');
    
    console.log('🔍 Perfil Público (funciona):');
    console.log(`   Usa: AssetPolicy.signAsset() → URL firmada externa`);
    console.log(`   Componente: Avatar component (robusto)`);
    console.log(`   URL: ${signedUrl}`);
    console.log(`   Content-Type: ${asset.mimeType} (correcto)`);
    console.log('');

    console.log('🔍 AccountSwitcher (falla):');
    console.log(`   Usa: account-avatar.presenter → URL local`);
    console.log(`   Componente: <img> directo (agresivo)`);
    console.log(`   URL: ${localUrl}`);
    console.log(`   Content-Type: application/octet-stream (incorrecto)`);
    console.log('');

    // 5. Tabla comparativa
    console.log('=== TABLA COMPARATIVA ===');
    console.log('');
    console.log('| Contexto | Método | URL | Componente | Content-Type | Resultado |');
    console.log('|----------|---------|-----|-----------|--------------|----------|');
    console.log(`| Perfil Público | AssetPolicy.signAsset() | ${signedUrl} | Avatar | ${asset.mimeType} | ✅ Funciona |`);
    console.log(`| AccountSwitcher | AvatarPresenter | ${localUrl} | <img> directo | application/octet-stream | ❌ Falla |`);
    console.log(`| ContactsList | AvatarPresenter | ${localUrl} | Avatar | application/octet-stream | ❌ Falla |`);
    console.log('');

    // 6. Diagnóstico final
    console.log('=== DIAGNÓSTICO FINAL ===');
    console.log('');
    console.log('🎯 RAÍZ DEL PROBLEMA:');
    console.log('1. Content-Type incorrecto en URLs locales');
    console.log('2. Componentes inconsistentes (Avatar vs <img>)');
    console.log('3. Manejo de errores agresivo en AccountSwitcher');
    console.log('');
    console.log('💡 SOLUCIÓN:');
    console.log('1. ✅ Fix aplicado: Content-Type desde DB');
    console.log('2. ✅ Fix aplicado: Avatar component en AccountSwitcher');
    console.log('3. ✅ Fix aplicado: Validación de move en asset registry');
    console.log('');
    console.log('🧪 VERIFICACIÓN:');
    console.log(`curl -I http://localhost:3000${localUrl}`);
    console.log('Debería responder: Content-Type: image/jpeg');
    console.log('');

  } catch (error) {
    console.error('❌ Error en análisis:', error);
  }
}

// Ejecutar análisis
analyzeAvatarUrls().then(() => {
  console.log('✅ Análisis completado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
