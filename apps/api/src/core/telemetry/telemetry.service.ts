import { coreEventBus } from '../events';

export type PipelineNodeStep = 'ingreso' | 'proyeccion' | 'worker' | 'dispatcher' | 'runtime' | 'certificacion' | 'entrega';

export interface PipelineTelemetryEvent {
  messageId: string;               
  conversationId: string;          
  accountId?: string;
  traceId?: string;                // 🧬 ID de vínculo con trazas técnicas
  step: PipelineNodeStep;          
  status: 'pending' | 'processing' | 'success' | 'error';
  metadata?: {
    runtimeId?: string;            
    model?: string;
    errorDetail?: string;
    latencyMs?: number;
    newSignalId?: number;
    triggerSignalId?: number | string;
    [key: string]: any; // Allow arbitrary debug info
  };
  timestamp: string;
}

export function emitTelemetry(
  messageId: string,
  conversationId: string,
  accountId: string | undefined,
  step: PipelineNodeStep,
  status: 'pending' | 'processing' | 'success' | 'error',
  metadata?: PipelineTelemetryEvent['metadata'],
  traceId?: string
) {
  try {
    const payload: PipelineTelemetryEvent = {
      messageId,
      conversationId,
      accountId,
      traceId,
      step,
      status,
      timestamp: new Date().toISOString(),
      metadata,
    };
    // Safe emisson that won't break the main pipeline
    coreEventBus.emit('telemetry:pipeline_step', payload);
  } catch (error) {
    console.error('[Telemetría] Error silencioso enviando telemetría:', error);
  }
}
