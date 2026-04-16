import { trace, context } from '@opentelemetry/api';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { coreEventBus } from '../core/events';

const provider = new BasicTracerProvider();
export const fluxTracer = provider.getTracer('fluxcore-kernel');

/**
 * CognitiveStepCollector — FluxCore v10.0
 * Singleton mejorado para agrupar pasos cognitivos usando traceId o correlationId.
 */
/**
 * Global Monitoring Registry — FluxCore v13.1
 * Tracks which accounts are being monitored and if they have persistence enabled.
 */
class MonitoringRegistry {
    private monitoredAccounts = new Map<string, { persistenceEnabled: boolean, subscribers: number }>();

    register(accountId: string, persistenceEnabled = false) {
        const current = this.monitoredAccounts.get(accountId) || { persistenceEnabled: false, subscribers: 0 };
        this.monitoredAccounts.set(accountId, { 
            persistenceEnabled: persistenceEnabled || current.persistenceEnabled, 
            subscribers: current.subscribers + 1 
        });
        console.log(`[MonitoringRegistry] 📡 Account registered: ${accountId} (subscribers: ${current.subscribers + 1})`);
    }

    unregister(accountId: string) {
        const current = this.monitoredAccounts.get(accountId);
        if (current) {
            if (current.subscribers <= 1) {
                this.monitoredAccounts.delete(accountId);
                console.log(`[MonitoringRegistry] 🔌 Account fully unregistered: ${accountId}`);
            } else {
                this.monitoredAccounts.set(accountId, { ...current, subscribers: current.subscribers - 1 });
                console.log(`[MonitoringRegistry] 🔌 Subscriber removed for: ${accountId} (remaining: ${current.subscribers - 1})`);
            }
        }
    }

    setPersistence(accountId: string, enabled: boolean) {
        const current = this.monitoredAccounts.get(accountId);
        if (current) {
            this.monitoredAccounts.set(accountId, { ...current, persistenceEnabled: enabled });
            console.log(`[MonitoringRegistry] 💾 Persistence for ${accountId} set to ${enabled}`);
        }
    }

    isMonitored(accountId: string): boolean {
        return this.monitoredAccounts.has(accountId);
    }

    isPersistenceEnabled(accountId: string): boolean {
        return this.monitoredAccounts.get(accountId)?.persistenceEnabled || false;
    }
}

export const monitoringRegistry = new MonitoringRegistry();

class CognitiveStepCollector {
    private steps = new Map<string, Record<string, any>>();

    record(id: string, stepName: string, data: any) {
        if (!id) return;
        const current = this.steps.get(id) || {};
        this.steps.set(id, { ...current, [stepName]: data });
    }

    getSteps(idOrIds: string | string[]) {
        const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
        let merged = {};
        for (const id of ids) {
            if (!id) continue;
            merged = { ...merged, ...(this.steps.get(id) || {}) };
        }
        return merged;
    }

    clear(id: string) {
        this.steps.delete(id);
    }
}

export const cognitiveCollector = new CognitiveStepCollector();

/**
 * Envoltorio determinista para ejecutar una fase del pipeline.
 * v10.0: Ahora soporta un executionId manual para evitar pérdidas por fragmentación de context.
 */
export async function trackCognitiveStep<T>(
  stepName: string, 
  attributes: Record<string, string>,
  payloadEnorme: unknown,
  fn: () => Promise<T>,
  executionId?: string // 🎯 Identidad de Turno Inquebrantable
): Promise<T> {
  const activeCtx = context.active();
  
  return await fluxTracer.startActiveSpan(stepName, {}, activeCtx, async (span) => {
    const spanCtx = span.spanContext();
    const traceId = spanCtx.traceId;
    
    // Registramos los metadatos
    span.setAttributes(attributes);
    
    // Reality Object
    let safePayload = payloadEnorme;
    try {
        JSON.stringify(payloadEnorme);
    } catch (e) {
        const { inspect } = require('util');
        safePayload = inspect(payloadEnorme, { depth: 4 });
    }

    const telemetryData = {
       traceId,
       spanId: spanCtx.spanId,
       parentSpanId: trace.getSpanContext(activeCtx)?.spanId,
       stepName,
       attributes,
       payloadEnorme: safePayload, 
       timestamp: new Date().toISOString(),
       executionId // Respaldado por el ID manual
    };
    
    // 🎯 REGISTRO DOBLE: Por TraceID y por ExecutionID (Manual)
    cognitiveCollector.record(traceId, stepName, safePayload);
    if (executionId) {
        cognitiveCollector.record(executionId, stepName, safePayload);
    }

    try {
      console.log(`[CognitivePipeline] 🧬 Phase: ${stepName} | TraceID: ${traceId} | ExecID: ${executionId || 'N/A'}`);
      coreEventBus.emit('telemetry:distributed_trace', telemetryData);
    } catch(err) {
      console.error('[OpenTelemetry] Error emitiendo rastro:', err);
    }

    try {
      const result = await fn();
      
      // 🎯 CAPTURA DE SALIDA (Output)
      let safeOutput = result;
      try {
          JSON.stringify(result);
      } catch (e) {
          const { inspect } = require('util');
          safeOutput = inspect(result, { depth: 4 });
      }

      // 🎯 ACTUALIZAR RECOLECTOR CON OUTPUT
      const currentEntry = cognitiveCollector.getSteps(traceId)?.[stepName] || { input: safePayload };
      cognitiveCollector.record(traceId, stepName, { ...currentEntry, output: safeOutput, status: 'completed' });
      if (executionId) {
          cognitiveCollector.record(executionId, stepName, { ...currentEntry, output: safeOutput, status: 'completed' });
      }

      // Emitimos el evento de finalización con el resultado
      coreEventBus.emit('telemetry:distributed_trace', {
          ...telemetryData,
          stepStatus: 'completed',
          output: safeOutput
      });

      span.end();
      return result;
    } catch (e: unknown) {
      // Emitimos el fallo
      coreEventBus.emit('telemetry:distributed_trace', {
          ...telemetryData,
          stepStatus: 'failed',
          error: e instanceof Error ? e.message : String(e)
      });

      if (e instanceof Error) span.recordException(e);
      span.end();
      throw e;
    }
  });
}
