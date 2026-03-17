#!/usr/bin/env bun

// Script para forzar el registro del listener en el servidor

console.log('🧪 FORZANDO REGISTRO DE LISTENER');

// Importar la instancia del servidor
import { mediaOrchestrator } from './apps/api/src/services/media-orchestrator.service';

// Forzar inicialización
console.log('🔧 Forzando inicialización de MediaOrchestrator...');
mediaOrchestrator.init();

console.log('✅ Listener forzado. Ahora prueba con un audio real.');
