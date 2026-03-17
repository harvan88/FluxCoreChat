#!/usr/bin/env bun

// Script para verificar el estado completo del sistema de audio

import { coreEventBus } from './apps/api/src/core/events';
import { mediaOrchestrator } from './apps/api/src/services/media-orchestrator.service';

console.log('🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA DE AUDIO');
console.log('='.repeat(50));

// 1. Verificar listeners
const listeners = coreEventBus.listenerCount('asset:ready');
console.log(`📊 Listeners para asset:ready: ${listeners}`);

// 2. Verificar si el evento se procesa
let eventReceived = false;
coreEventBus.on('asset:ready', (payload) => {
  eventReceived = true;
  console.log('✅ EVENTO RECIBIDO:', payload);
});

// 3. Forzar listener
console.log('🔧 Forzando listener...');
mediaOrchestrator.init();

// 4. Verificar listeners después de forzar
const listenersAfter = coreEventBus.listenerCount('asset:ready');
console.log(`📊 Listeners después de forzar: ${listenersAfter}`);

// 5. Emitir evento de prueba
console.log('📢 Emitiendo evento de prueba...');
coreEventBus.emit('asset:ready', {
  assetId: 'test-diagnostic-123',
  accountId: 'test-diagnostic-123',
  mimeType: 'audio/webm'
});

// 6. Esperar y verificar
setTimeout(() => {
  console.log('='.repeat(50));
  console.log('📋 RESULTADOS:');
  console.log(`✅ Evento recibido: ${eventReceived}`);
  console.log(`📊 Listeners iniciales: ${listeners}`);
  console.log(`📊 Listeners finales: ${listenersAfter}`);
  
  if (!eventReceived) {
    console.log('❌ PROBLEMA: El evento no se está procesando');
    console.log('🔍 Solución: El listener no está registrado correctamente');
  } else {
    console.log('✅ El listener funciona');
  }
  
  process.exit(0);
}, 2000);
