#!/usr/bin/env bun

// Script para verificar si el evento asset:ready se está procesando

import { coreEventBus } from './apps/api/src/core/events';

console.log('🧪 VERIFICANDO PROCESAMIENTO DE asset:ready');

// 1. Verificar si hay listeners
const listeners = coreEventBus.listenerCount('asset:ready');
console.log(`📊 Listeners para asset:ready: ${listeners}`);

// 2. Agregar un listener temporal para verificar
coreEventBus.on('asset:ready', (payload) => {
  console.log('🎯 EVENTO RECIBIDO EN SCRIPT:', payload);
});

// 3. Emitir evento de prueba
console.log('📢 EMITIENDO asset:ready de prueba...');
coreEventBus.emit('asset:ready', {
  assetId: 'test-asset-456',
  accountId: 'test-account-456',
  mimeType: 'audio/webm'
});

console.log('✅ Evento emitido. Si el sistema funciona, deberías ver logs en el servidor.');

setTimeout(() => {
  console.log('🏁 Fin de la verificación');
  process.exit(0);
}, 3000);
