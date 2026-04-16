import { coreEventBus } from '../core/events';
import { emitTelemetry } from '../core/telemetry/telemetry.service';
import crypto from 'node:crypto';

/**
 * Simulador de Flujo del Kernel
 * 
 * Este script simula una pasada completa por el pipeline de 7 pasos
 * y emite trazas técnicas detalladas para las fases cognitivas 0-3.
 */

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulate() {
  const messageId = crypto.randomUUID();
  const conversationId = crypto.randomUUID();
  const traceId = crypto.randomBytes(16).toString('hex');
  const accountId = '3e94f74e-e6a0-4794-bd66-16081ee3b02d'; // Harvan account for auto-visibility

  console.log(`\n🚀 Iniciando simulación de flujo unificado...`);
  console.log(`🆔 Message: ${messageId}`);
  console.log(`🧬 Trace: ${traceId}\n`);

  const steps: any[] = [
    { id: 'ingreso', name: 'Certificación de Ingreso' },
    { id: 'proyeccion', name: 'Proyección de Realidad' },
    { id: 'worker', name: 'Cognitive Worker' },
    { id: 'dispatcher', name: 'Despacho de Intención' },
    { id: 'runtime', name: 'Runtime de IA (Fases 0-3)' },
    { id: 'certificacion', name: 'Certificación de Salida' },
    { id: 'entrega', name: 'Entrega Final' }
  ];

  for (const step of steps) {
    console.log(`[Step] ${step.name}...`);
    
    // Marcar como procesando
    emitTelemetry(messageId, conversationId, accountId, step.id, 'processing', {}, traceId);
    await sleep(800);

    // Si es el runtime, emitimos las trazas técnicas de las fases 0-3
    if (step.id === 'runtime') {
      await simulatePhases(traceId, accountId, conversationId);
    }

    // Marcar como completado
    emitTelemetry(messageId, conversationId, accountId, step.id, 'success', { latencyMs: 800 }, traceId);
    await sleep(400);
  }

  console.log(`\n✅ Simulación completada para ${messageId}`);
}

async function simulatePhases(traceId: string, accountId: string, conversationId: string) {
  const phases = [
    {
      name: 'FASE_0_SIEVE',
      input: { text: "Hola, necesito ayuda con mi pedido", templates_loaded: 45 },
      output: { active_templates: ["pedido_status", "saludo_general"] }
    },
    {
      name: 'FASE_1_ROUTER',
      input: { context: "Usuario pregunta por pedido", options: ["pedido_status", "saludo_general"] },
      output: { selected_template: "pedido_status", confidence: 0.98 }
    },
    {
      name: 'FASE_2_RAG',
      input: { query: "estado de pedido", vector_space: "ecommerce_docs" },
      output: { fragments: [{ id: 101, text: "Los pedidos tardan 24h", score: 0.92 }] }
    },
    {
      name: 'FASE_3_RESOLUTIVE_CALL',
      input: { prompt: "Responde al usuario que su pedido llega pronto...", model: "gpt-4o" },
      output: { response: "¡Hola! He revisado tu pedido y está en camino. Debería llegar en 24h." }
    }
  ];

  for (const phase of phases) {
    console.log(`  [Phase] ${phase.name}...`);
    const spanId = crypto.randomBytes(8).toString('hex');

    // Emisión de traza técnica
    coreEventBus.emit('telemetry:distributed_trace', {
      traceId,
      spanId,
      stepName: phase.name,
      attributes: {
        'account.id': accountId,
        'conversation.id': conversationId
      },
      payloadEnorme: phase.input,
      output: phase.output,
      stepStatus: 'completed',
      timestamp: new Date().toISOString()
    });

    await sleep(600);
  }
}

simulate().catch(console.error);
