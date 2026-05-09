/**
 * useTelemetry Hook (Unified Kernel Monitor v1.0)
 * 
 * Gestiona la conexión única a la telemetría del Kernel y la IA.
 * Agrupa eventos de alto nivel (pasos del pipeline) con trazas técnicas (E/S).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { getWsUrl } from '../utils/urls';

const WS_URL = getWsUrl();

export interface TelemetryStep {
    step: string;
    status: 'pending' | 'processing' | 'success' | 'error';
    timestamp: string;
    metadata?: any;
    traceId?: string;
}

export interface TechnicalTrace {
    stepName: string;
    input: any;
    output?: any;
    error?: string;
    status: 'completed' | 'failed';
    timestamp: string;
    spanId: string;
}

export interface TelemetryGroup {
    messageId: string;
    conversationId: string;
    accountId: string;
    steps: Record<string, TelemetryStep>;
    traces: TechnicalTrace[];
    lastUpdate: string;
    isPersisted?: boolean;
}

interface UseTelemetryOptions {
    accountId: string;
    conversationId?: string;
    autoConnect?: boolean;
}

export function useTelemetry({ accountId, conversationId, autoConnect = true }: UseTelemetryOptions) {
    const { token } = useAuthStore();
    const [groups, setGroups] = useState<Record<string, TelemetryGroup>>({});
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
    const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(false);
    
    const wsRef = useRef<WebSocket | null>(null);
    const groupsRef = useRef<Record<string, TelemetryGroup>>({});

    // Sincronizar ref con state para acceso en callbacks
    useEffect(() => {
        groupsRef.current = groups;
    }, [groups]);

    const connect = useCallback(() => {
        if (!token) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        // Si no hay accountId, asumimos modo omnisciente para Harvan
        const effectiveAccountId = accountId || 'all';
        const url = `${WS_URL}?token=${token}&accountId=${effectiveAccountId}`;
        const ws = new WebSocket(url);
        setStatus('connecting');

        ws.onopen = () => {
            console.log('[useTelemetry] Connected to Kernel Stream');
            setStatus('connected');
            // Suscribirse a la telemetría
            ws.send(JSON.stringify({ 
                type: 'subscribe_telemetry', 
                role: 'kernel_console',
                conversationId: conversationId 
            }));
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                if (message.type === 'telemetry:pipeline_step') {
                    handlePipelineStep(message.payload);
                } else if (message.type === 'telemetry:distributed_trace') {
                    handleTechnicalTrace(message.payload);
                } else if (message.type === 'save_trace_result') {
                    if (message.success) {
                        setGroups(prev => ({
                            ...prev,
                            [message.messageId]: { ...prev[message.messageId], isPersisted: true }
                        }));
                        console.log(`[useTelemetry] ✅ Trace ${message.messageId} saved manually.`);
                    } else {
                        console.error('[useTelemetry] ❌ Failed to save trace:', message.error);
                        alert(`Error al guardar traza: ${message.error}`);
                    }
                }
            } catch (err) {
                console.warn('[useTelemetry] Failed to parse message', err);
            }
        };

        ws.onclose = () => {
            console.log('[useTelemetry] Disconnected');
            setStatus('disconnected');
            // Reintento simple
            if (autoConnect) setTimeout(connect, 3000);
        };

        wsRef.current = ws;
    }, [token, accountId, conversationId, autoConnect]);

    const handlePipelineStep = (payload: any) => {
        const { messageId, step, status, timestamp, metadata, traceId, conversationId: convId, accountId: accId } = payload;
        
        setGroups(prev => {
            const current = prev[messageId] || {
                messageId,
                conversationId: convId,
                accountId: accId,
                steps: {},
                traces: [],
                lastUpdate: new Date().toISOString()
            };

            return {
                ...prev,
                [messageId]: {
                    ...current,
                    steps: {
                        ...current.steps,
                        [step]: { step, status, timestamp, metadata, traceId }
                    },
                    lastUpdate: new Date().toISOString()
                }
            };
        });
    };

    const handleTechnicalTrace = (payload: any) => {
        const { stepName, payloadEnorme, output, stepStatus, timestamp, spanId, attributes, executionId } = payload;
        
        // El executionId en el backend es a menudo el messageId
        const messageId = executionId; 
        if (!messageId) return;

        setGroups(prev => {
            const current = prev[messageId] || {
                messageId,
                conversationId: attributes?.['conversation.id'],
                accountId: attributes?.['account.id'],
                steps: {},
                traces: [],
                lastUpdate: new Date().toISOString()
            };

            // 🎯 DESDUPLICACIÓN POR SPAN_ID (v10.1)
            // Si el spanId ya existe, lo reemplazamos con la versión más reciente (que contiene el output)
            return {
                ...prev,
                [messageId]: {
                    ...current,
                    traces: [
                        ...current.traces.filter(t => t.spanId !== spanId),
                        {
                            stepName,
                            input: payloadEnorme,
                            output,
                            status: stepStatus,
                            timestamp,
                            spanId
                        }
                    ],
                    lastUpdate: new Date().toISOString()
                }
            };
        });
    };

    const clear = () => setGroups({});

    // 🎯 CARGA DE HISTORIAL DETERMINISTA (v10.0)
    // Permite auditar turnos pasados que ya están en la base de datos.
    const loadHistory = useCallback(async () => {
        if (!token || !accountId) return;
        
        try {
            // Buscamos las últimas trazas en el API
            // Si es global (sin accountId), el API nos devolverá las últimas multicuenta (requiere ser Admin)
            const queryParam = accountId ? `accountId=${accountId}&` : '';
            const res = await fetch(`/api/fluxcore/traces?${queryParam}limit=20`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.success && Array.isArray(data.data)) {
                const historyGroups: Record<string, TelemetryGroup> = {};
                
                for (const trace of data.data) {
                    const msgId = trace.messageId || trace.id;
                    const requestBody = trace.requestBody || {};
                    const context = requestBody.contextSnapshot || {};
                    const cognitiveSteps = context._cognitiveSteps || {};
                    
                    // Reconstruir pasos del pipeline básicos
                    const steps: Record<string, TelemetryStep> = {
                        'runtime': { 
                            step: 'runtime', 
                            status: 'success', 
                            timestamp: trace.createdAt, 
                            metadata: { provider: trace.provider, model: trace.model }
                        }
                    };

                    // Reconstruir trazas técnicas desde el snapshot persistido
                    const traces: TechnicalTrace[] = Object.entries(cognitiveSteps).map(([name, payload]: [string, any]) => ({
                        stepName: name,
                        input: payload.input || payload,
                        output: payload.output || 'Persistido en DB',
                        status: 'completed',
                        timestamp: trace.createdAt,
                        spanId: `db-${trace.id}-${name}`
                    }));

                    historyGroups[msgId] = {
                        messageId: msgId,
                        conversationId: trace.conversationId,
                        accountId: trace.accountId,
                        steps,
                        traces,
                        lastUpdate: trace.createdAt,
                        isPersisted: true // Marcamos como persistido lo que viene de la DB
                    };
                }

                setGroups(prev => ({ ...historyGroups, ...prev }));
                console.log(`[useTelemetry] ✅ ${Object.keys(historyGroups).length} turnos cargados del historial.`);
            }
        } catch (err) {
            console.error('[useTelemetry] ❌ Error loading history:', err);
        }
    }, [token, accountId]);

    const togglePersistence = useCallback((enabled: boolean) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'toggle_persistence',
                accountId,
                content: enabled
            }));
            setIsPersistenceEnabled(enabled);
        }
    }, [accountId]);

    const clearServerHistory = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN && window.confirm('¿Seguro que quieres borrar todo el historial forense de esta cuenta?')) {
            wsRef.current.send(JSON.stringify({
                type: 'clear_telemetry_history',
                accountId
            }));
        }
    }, [accountId]);

    const saveTrace = useCallback((groupId: string) => {
        const group = groups[groupId];
        if (!group || wsRef.current?.readyState !== WebSocket.OPEN) return;

        // Mapear TelemetryGroup al formato que espera aiTraceService
        const requestContext = {
            _cognitiveSteps: group.traces.reduce((acc: any, t) => {
                acc[t.stepName] = { input: t.input, output: t.output, status: t.status };
                return acc;
            }, {}),
            actionCount: Object.keys(group.steps).length,
            actionTypes: Object.keys(group.steps),
            // Reconstrucción de actions si es posible
            actions: group.steps['dispatcher']?.metadata?.actions || [] 
        };

        const traceData = {
            accountId: group.accountId,
            conversationId: group.conversationId,
            messageId: group.messageId,
            runtime: group.steps['runtime']?.metadata?.runtimeId || 'unknown',
            provider: group.steps['runtime']?.metadata?.provider || 'unknown',
            model: group.steps['runtime']?.metadata?.model || 'unknown',
            mode: 'manual_audit',
            requestBody: {}, // Podríamos capturar el mensaje original aquí si estuviera disponible
            requestContext,
            responseContent: group.steps['dispatcher']?.metadata?.summary || 'Manual Save',
            startedAt: group.steps['runtime']?.timestamp || new Date().toISOString(),
            completedAt: new Date().toISOString()
        };

        wsRef.current.send(JSON.stringify({
            type: 'save_forensic_trace',
            traceData
        }));
    }, [groups, accountId]);

    useEffect(() => {
        if (autoConnect) connect();
        return () => wsRef.current?.close();
    }, [connect, autoConnect]);

    // Auto-hidratación
    useEffect(() => {
        if (autoConnect && token) {
            loadHistory();
        }
    }, [accountId, autoConnect, token]);

    return {
        groups,
        status,
        clear,
        loadHistory,
        saveTrace,
        togglePersistence,
        clearServerHistory,
        isPersistenceEnabled,
        isConnected: status === 'connected'
    };
}
