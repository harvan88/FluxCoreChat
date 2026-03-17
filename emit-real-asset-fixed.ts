#!/usr/bin/env bun

// Script para emitir asset:ready para el asset real con UUID válido

import { coreEventBus } from './apps/api/src/core/events';

console.log('🎯 EMITIENDO asset:ready PARA ASSET REAL');

// Emitir evento para el asset real que existe en la BD
console.log('📢 Emitiendo asset:ready para 5778fcf5-2d8d-40eb-939c-1c881ff49942...');
coreEventBus.emit('asset:ready', {
  assetId: '5778fcf5-2d8d-40eb-939c-1c881ff49942',
  accountId: '3e94f74e-e6a0-4794-bd66-16081ee3b02d',
  mimeType: 'video/webm'
});

console.log('✅ Evento emitido. Revisa los logs del servidor para ver la transcripción.');

setTimeout(() => {
  console.log('🏁 Verificando en base de datos...');
  process.exit(0);
}, 5000);
