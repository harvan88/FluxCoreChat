#!/usr/bin/env bun

// Script para probar el evento asset:ready directamente

import { coreEventBus } from './apps/api/src/core/events';

console.log('🧪 PRUEBA DIRECTA DEL EVENTO asset:ready');

// 1. Emitir un evento de prueba
console.log('📢 EMITIENDO asset:ready de prueba...');
coreEventBus.emit('asset:ready', {
  assetId: 'test-asset-123',
  accountId: 'test-account-123',
  mimeType: 'audio/webm'
});

console.log('✅ Evento emitido. Revisa los logs del servidor.');
console.log('📋 Deberías ver:');
console.log('   - 🔔 RECEIVED asset:ready event');
console.log('   - 🎧 Asset is AUDIO - starting enrichment');
console.log('   - 🎵 AUDIO ASSET READY: assetId=test-asset-123');

// 2. Esperar un momento para que se procese
setTimeout(() => {
  console.log('🏁 Fin de la prueba');
  process.exit(0);
}, 3000);
