#!/usr/bin/env bun

// Script para forzar la transcripción del último asset de audio

import { coreEventBus } from './apps/api/src/core/events';
import { db } from './apps/api/src/db';
import { assets, messageAssets, assetEnrichments } from './packages/db/src/schema';
import { eq, desc } from 'drizzle-orm';

console.log('🎯 FORZANDO TRANSCRIPCIÓN DE AUDIO');

try {
  // Obtener el asset más reciente
  const [latestAsset] = await db
    .select()
    .from(assets)
    .where(eq(assets.status, 'ready'))
    .orderBy(desc(assets.createdAt))
    .limit(1);

  if (!latestAsset) {
    console.log('❌ No se encontró ningún asset ready');
    process.exit(0);
  }

  console.log(`✅ Asset encontrado: ${latestAsset.id}`);
  console.log(`📊 Tipo: ${latestAsset.mimeType}`);
  console.log(`📅 Creado: ${latestAsset.createdAt}`);

  // Verificar si está vinculado a un mensaje
  const [linkedMessage] = await db
    .select()
    .from(messageAssets)
    .where(eq(messageAssets.assetId, latestAsset.id))
    .limit(1);

  if (!linkedMessage) {
    console.log('❌ El asset no está vinculado a ningún mensaje');
    process.exit(0);
  }

  console.log(`✅ Vinculado al mensaje: ${linkedMessage.messageId}`);

  // Emitir evento asset:ready
  console.log('📢 EMITIENDO asset:ready...');
  coreEventBus.emit('asset:ready', {
    assetId: latestAsset.id,
    accountId: latestAsset.accountId,
    mimeType: latestAsset.mimeType,
  });

  console.log('✅ Evento emitido. La transcripción debería comenzar ahora.');

  // Esperar un momento y verificar
  setTimeout(async () => {
    console.log('🔍 Verificando si se creó la transcripción...');
    
    const [enrichment] = await db
      .select()
      .from(assetEnrichments)
      .where(eq(assetEnrichments.assetId, latestAsset.id))
      .limit(1);

    if (enrichment) {
      console.log('✅ ¡TRANSCRIPCIÓN CREADA!');
      console.log(`📝 Texto: ${JSON.parse(enrichment.payload as string).text?.substring(0, 100)}...`);
    } else {
      console.log('❌ No se creó la transcripción');
    }

    process.exit(0);
  }, 3000);

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
