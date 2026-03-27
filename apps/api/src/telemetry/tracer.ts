import { trace, context } from '@opentelemetry/api';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { coreEventBus } from '../core/events';

// Inicialización básica requerida para que OpenTelemetry genere IDs (traceId, spanId)
// sin necesidad de exportarlos a un colector externo como Jaeger.
const provider = new BasicTracerProvider();
export const fluxTracer = provider.getTracer('fluxcore-kernel');

/**
 * Envoltorio determinista para ejecutar una función y capturar de manera asíncrona
 * el ciclo de vida del dato "payloadEnorme" forzando su envío al webSocket.
 */
export async function trackCognitiveStep<T>(
  stepName: string, 
  attributes: Record<string, string>,
  payloadEnorme: unknown,
  fn: () => Promise<T>
): Promise<T> {
  return await fluxTracer.startActiveSpan(stepName, async (span) => {
    // Registramos los metadatos de búsqueda
    span.setAttributes(attributes);
    
    // Armamos el Reality Object con la jerarquía
    // 🎯 PREVENIR ERRORES DE REFERENCIA CIRCULAR AL SERIALIZAR PAYLOAD ENORME
    let safePayload = payloadEnorme;
    try {
        JSON.stringify(payloadEnorme);
    } catch (e) {
        // Fallback: Si el payloadEnorme tiene circular refs o falla, sanitizamos
        const { inspect } = require('util');
        safePayload = inspect(payloadEnorme, { depth: 4 });
    }

    const telemetryData = {
       traceId: span.spanContext().traceId,
       spanId: span.spanContext().spanId,
       parentSpanId: trace.getSpanContext(context.active())?.spanId,
       stepName,
       attributes,
       payloadEnorme: safePayload, 
       timestamp: new Date().toISOString()
    };
    
    try {
      console.log(`[OpenTelemetry] 🚀 EMITIENDO TRAZA AL coreEventBus: ${stepName} (TraceID: ${telemetryData.traceId})`);
      // Forzamos el envío de la traza para des-cegar al Frontend (incluso antes de resolver la promesa)
      // para ver si el payload entró bien a este paso.
      coreEventBus.emit('telemetry:distributed_trace', telemetryData);
    } catch(err) {
      console.error('[OpenTelemetry] Error emitiendo rastro:', err);
    }

    try {
      const result = await fn();
      
      // Podríamos emitir otro evento de "fin" o actualizar el anterior, 
      // pero para la prioridad de ver las "Plantillas", la entrada es clave.
      span.end();
      return result;
    } catch (e: unknown) {
      if (e instanceof Error) span.recordException(e);
      span.end();
      throw e;
    }
  });
}
