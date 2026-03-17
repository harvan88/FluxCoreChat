import { coreEventBus } from '../events';

export type PipelineNodeStep = 'ingreso' | 'proyeccion' | 'worker' | 'dispatcher' | 'runtime' | 'certificacion' | 'entrega';

export interface PipelineTelemetryEvent {
  messageId: string;               
  conversationId: string;          
  step: PipelineNodeStep;          
  status: 'pending' | 'processing' | 'success' | 'error';
  metadata?: {
    runtimeId?: string;            
    model?: string;
    errorDetail?: string;
    latencyMs?: number;
  };
  timestamp: string;
}

export function emitTelemetry(
  messageId: string,
  conversationId: string,
  step: PipelineNodeStep,
  status: 'pending' | 'processing' | 'success' | 'error',
  metadata?: PipelineTelemetryEvent['metadata']
) {
  try {
    const payload: PipelineTelemetryEvent = {
      messageId,
      conversationId,
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
