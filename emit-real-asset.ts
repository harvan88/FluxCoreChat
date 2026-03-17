#!/usr/bin/env bun

// Script para emitir el evento asset:ready para el asset real

import { coreEventBus } from './apps/api/src/core/events';

console.log('🧪 EMITIENDO asset:ready PARA EL ASSET REAL');

// Emitir evento para el asset real que acabas de crear
console.log('📢 EMITIENDO asset:ready para asset 5778fcf5-2d8d-40eb-939c-1c881ff49942...');
coreEventBus.emit('asset:ready', {
  assetId: '5778fcf5-2d8d-40eb-939c-1c881ff49942',
  accountId: '3e94f74e-e6a0-4794-bd66-16081ee3b02d', // Tu account ID
  mimeType: 'video/webm'
});

console.log('✅ Evento emitido para el asset real. Revisa los logs del servidor.');

setTimeout(() => {
  console.log('🏁 Fin de la prueba');
  process.exit(0);
}, 3000);
