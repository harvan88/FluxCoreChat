import { DebugOutboxDebugger } from '../services/debug-outbox-debugger.service';

/**
 * Script para ejecutar el debugger de outbox
 */
async function runDebugOutbox() {
  console.log('🔍 INICIANDO DEBUG OUTBOX DEBUGGER');

  try {
    // 1. Procesar el último outbox
    await DebugOutboxDebugger.debugLastOutbox();

    // 2. Procesar todos los pendientes
    await DebugOutboxDebugger.debugProcessAllPending();

    console.log('\n✅ DEBUG COMPLETADO');

  } catch (error) {
    console.error('❌ Error en debug:', error);
  }
}

runDebugOutbox().catch(console.error);
