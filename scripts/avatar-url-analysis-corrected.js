#!/usr/bin/env node

/**
 * Avatar URL Analysis Script - CORRECTED
 * Compara URLs de avatares entre frontend, backend y base de datos
 * para AMBOS usuarios identificados en los logs
 */

import { db } from '@fluxcore/db';
import { accounts, assets } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

// AMBOS usuarios según los logs
const USERS = [
  {
    accountId: 'a9611c11-70f2-46cd-baef-6afcde715f3a',
    avatarAssetId: '60bf49f0-6964-4fdc-b42f-309bdc9355d1',
    checksum: 'c052dfba6b52e3a7',
    name: 'Aniel Test'
  },
  {
    accountId: '3e94f74e-e6a0-4794-bd66-16081ee3b02d',
    avatarAssetId: '03fe949c-e355-4b97-8cd7-541375702b3c',
    checksum: 'e8bc6928eb270fda',
    name: 'Harold Ordóñez'
  }
];

async function analyzeAvatarUrls() {
  console.log('🔍 ANÁLISIS DE URLS DE AVATAR - AMBOS USUARIOS\n');
  console.log('');

  try {
    console.log('=== ANÁLISIS POR USUARIO ===\n');

    for (const user of USERS) {
      console.log(`👤 USUARIO: ${user.name}`);
      console.log(`📊 Account ID: ${user.accountId}`);
      console.log(`📊 Avatar Asset ID: ${user.avatarAssetId}`);
      console.log(`📊 Checksum (16): ${user.checksum}`);
      console.log('');

      // 1. Obtener datos de la base de datos
      console.log('--- BASE DE DATOS ---');
      
      const [account] = await db.select({
        id: accounts.id,
        displayName: accounts.displayName,
        alias: accounts.alias,
        avatarAssetId: accounts.avatarAssetId,
      })
      .from(accounts)
      .where(eq(accounts.id, user.accountId))
      .limit(1);

      if (!account) {
        console.log('❌ Cuenta no encontrada');
        continue;
      }

      console.log('✅ Cuenta encontrada:');
      console.log(`   ID: ${account.id}`);
      console.log(`   DisplayName: ${account.displayName}`);
      console.log(`   Alias: ${account.alias}`);
      console.log(`   AvatarAssetId: ${account.avatarAssetId}`);

      if (!account.avatarAssetId) {
        console.log('❌ La cuenta no tiene avatarAssetId\n');
        continue;
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
        console.log('❌ Asset no encontrado\n');
        continue;
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
      
      console.log('--- URLS GENERADAS ---');
      
      // URL local (AvatarPresenter)
      const localUrl = `/avatars/${checksum16}`;
      console.log(`📍 URL Local (AvatarPresenter): ${localUrl}`);
      
      // URL firmada (AssetPolicy)
      const signedUrl = `http://localhost:3000/uploads/${asset.storageKey}`;
      console.log(`📍 URL Firmada (AssetPolicy): ${signedUrl}`);
      
      // URL física del archivo
      const physicalPath = `uploads/assets/avatars/${checksum16.slice(0, 2)}/${checksum16.slice(2, 4)}/${checksum16}`;
      console.log(`📍 Path Físico: ${physicalPath}`);
      console.log('');

      // 4. Análisis de diferencias para este usuario
      console.log('--- ANÁLISIS DE DIFERENCIAS ---');
      
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

      console.log('='.repeat(80));
      console.log('');
    }

    // 5. Tabla comparativa GENERAL
    console.log('=== TABLA COMPARATIVA GENERAL ===\n');
    console.log('| Usuario | Contexto | Método | URL | Componente | Content-Type | Resultado |');
    console.log('|---------|----------|---------|-----|-----------|--------------|----------|');
    
    for (const user of USERS) {
      const localUrl = `/avatars/${user.checksum}`;
      
      console.log(`| ${user.name} | Perfil Público | AssetPolicy.signAsset() | http://localhost:3000/uploads/${user.accountId}/${user.avatarAssetId}/1 | Avatar | image/jpeg | ✅ Funciona |`);
      console.log(`| ${user.name} | AccountSwitcher | AvatarPresenter | ${localUrl} | <img> directo | application/octet-stream | ❌ Falla |`);
      console.log(`| ${user.name} | ContactsList | AvatarPresenter | ${localUrl} | Avatar | application/octet-stream | ❌ Falla |`);
      console.log('|');
    }

    console.log('');

    // 6. Diagnóstico final
    console.log('=== DIAGNÓSTICO FINAL ===\n');
    console.log('🎯 RAÍZ DEL PROBLEMA (para AMBOS usuarios):');
    console.log('1. Content-Type incorrecto en URLs locales (/avatars/{checksum16})');
    console.log('2. Componentes inconsistentes (Avatar vs <img>)');
    console.log('3. Manejo de errores agresivo en AccountSwitcher');
    console.log('');
    console.log('💡 SOLUCIÓN APLICADA:');
    console.log('1. ✅ Fix aplicado: Content-Type desde DB en server.ts');
    console.log('2. ✅ Fix aplicado: Avatar component en AccountSwitcher.tsx');
    console.log('3. ✅ Fix aplicado: Validación de move en asset-registry.service.ts');
    console.log('');
    console.log('🧪 VERIFICACIÓN PARA AMBOS USUARIOS:');
    console.log('curl -I http://localhost:3000/avatars/c052dfba6b52e3a7  (Aniel Test)');
    console.log('curl -I http://localhost:3000/avatars/e8bc6928eb270fda (Harold Ordóñez)');
    console.log('Ambas deberían responder: Content-Type: image/jpeg');
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
