# CURRENT STATE SNAPSHOT

## 📋 ESTADO ACTUAL DEL KERNEL

*Fecha de actualización: 2026-03-01T14:21:16.427Z*
*Total de archivos: 16*
*Tipo: 🌍 DINÁMICO - SIN INTERPRETACIONES HARCODEADAS*
*Análisis: Se hace al leer, no al escribir*
*Script: bun run src/scripts/update-snapshot.ts*
----

## 📋 CÓMO USAR ESTE SNAPSHOT:

### 🔍 **PARA ANÁLISIS DE SOBERANÍA:**
1. **Buscar "ingestSignal"** → Ctrl+F para encontrar todos los call sites
2. **Buscar "kernel.ingestSignal"** → Verificar llamadas directas
3. **Buscar "messageService.createMessage"** → Verificar orden de persistencia
4. **Buscar "certifyIngress"** → Verificar flujo de certificación

### 🔍 **PARA ANÁLISIS DE WORLD DEFINER:**
1. **Buscar "ChatCoreWorldDefiner"** → Verificar implementación
2. **Buscar "defineWorld"** → Verificar lógica centralizada
3. **Buscar "resolveChannel"** → Verificar detección de canales

### 🔍 **PARA ANÁLISIS DE PROJECTORS:**
1. **Buscar "projectMessage"** → Verificar procesamiento
2. **Buscar "worldContext"** → Verificar uso de metadata
3. **Buscar "routing"** → Verificar decisiones de routing

---

## 🚨 NO CONTIENE INTERPRETACIONES ESTÁTICAS

### ❌ **LO QUE NO TIENE:**
- **Análisis hardcodeado** de soberanía
- **Call sites estáticos** que quedan desactualizados
- **Estado predefinido** que no refleja cambios
- **Interpretaciones** que pueden ser incorrectas

### ✅ **LO QUE SÍ TIENE:**
- **Código fuente** completo y actualizado
- **Búsqueda dinámica** de patrones
- **Análisis en tiempo real** al leerlo
- **Referencia exacta** del estado actual

---

## 📁 kernel.ts

```typescript
import crypto from 'node:crypto';
import { db, fluxcoreSignals, fluxcoreOutbox } from '@fluxcore/db';
import type { KernelCandidateSignal, PhysicalFactType } from './types';

/**
 * FluxCore Kernel — RFC-0001 (RATIFIED)
 *
 * SOVEREIGN REALITY CERTIFIER
 *
 * The Kernel does ONE thing: certify that FluxCore received
 * evidence from the external world through an authorized Reality Adapter.
 *
 * It does NOT:
 *   - Know what a user, account, conversation, or message is
 *   - Interpret payloads
 *   - Emit business events
 *   - Allow direct invocation from services, IA, or controllers
 *
 * ONLY registered Reality Adapters (SENSOR/GATEWAY) may invoke ingestSignal().
 */

const PHYSICAL_FACT_TYPES: ReadonlySet<PhysicalFactType> = new Set([
    'EXTERNAL_INPUT_OBSERVED',
    'EXTERNAL_STATE_OBSERVED',
    'DELIVERY_SIGNAL_OBSERVED',
    'MEDIA_CAPTURED',
    'SYSTEM_TIMER_ELAPSED',
    'CONNECTION_EVENT_OBSERVED',
    'chatcore.message.received',
]);

// ─────────────────────────────────────────────
// Deterministic Canonicalization & Fingerprinting
// ─────────────────────────────────────────────

function canonicalize(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return '[' + value.map(canonicalize).join(',') + ']';
    }

    const entries = Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    return '{' + entries
        .map(([key, val]) => JSON.stringify(key) + ':' + canonicalize(val))
        .join(',') + '}';
}

function checksumEvidence(raw: unknown): string {
    const serialized = canonicalize(raw ?? null);
    return crypto.createHash('sha256').update(serialized).digest('hex');
}

function fingerprint(candidate: KernelCandidateSignal, checksum: string): string {
    const base = [
        candidate.certifiedBy.adapterId,
        candidate.source.namespace,
        candidate.source.key,
        candidate.evidence.provenance.externalId ?? '',
        checksum,
    ].join('|');

    return crypto.createHash('sha256').update(base).digest('hex');
}

// ─────────────────────────────────────────────
// Kernel
// ─────────────────────────────────────────────

export class Kernel {
    /**
     * Ingests a certified observation into the Journal.
     *
     * This is the ONLY entry point for facts into
     * system sovereign state.
     *
     * CALLER RESTRICTION:
     *   Only registered Reality Adapters (class SENSOR or GATEWAY)
     *   may invoke this method. INTERPRETER adapters, services,
     *   IA agents, and controllers are PROHIBITED.
     */
    async ingestSignal(candidate: KernelCandidateSignal): Promise<number> {
        console.log(`[Diag][Kernel] message=${candidate.evidence.provenance.externalId || candidate.source.key} runtime=- decision=respond stage=ingest_start fact=${candidate.factType}`);
        // ── Gate 1: Physical fact type ──
        if (!PHYSICAL_FACT_TYPES.has(candidate.factType)) {
            throw new Error(`Unknown physical fact class: ${candidate.factType}`);
        }

        // ── Gate 2: Adapter registration ──
        const adapterAllowed = await db.query.fluxcoreRealityAdapters.findFirst({
            where: (t, { eq }) => eq(t.adapterId, candidate.certifiedBy.adapterId),
            columns: {
                adapterId: true,
                driverId: true,
                adapterClass: true,
                signingSecret: true,
                adapterVersion: true,
            },
        });

        if (!adapterAllowed) {
            throw new Error(`Unknown reality adapter: ${candidate.certifiedBy.adapterId}`);
        }

        // ── Gate 3: Adapter class ──
        if (adapterAllowed.adapterClass === 'INTERPRETER') {
            throw new Error(
                `Interpreter adapters cannot certify physical reality (${candidate.certifiedBy.adapterId})`
            );
        }

        // ── Gate 4: Driver match ──
        if (adapterAllowed.driverId !== candidate.evidence.provenance.driverId) {
            throw new Error(
                `Driver mismatch for adapter ${candidate.certifiedBy.adapterId}`
            );
        }

        // ── Gate 5: HMAC signature verification ──
        const canonicalCandidate = canonicalize({
            factType: candidate.factType,
            source: candidate.source,
            subject: candidate.subject ?? null,
            object: candidate.object ?? null,
            evidence: candidate.evidence,
            adapterId: candidate.certifiedBy.adapterId,
            adapterVersion: candidate.certifiedBy.adapterVersion,
        });

        const expectedSignature = crypto
            .createHmac('sha256', adapterAllowed.signingSecret)
            .update(canonicalCandidate)
            .digest('hex');

        if (expectedSignature !== candidate.certifiedBy.signature) {
            throw new Error('Invalid reality adapter signature');
        }

        // ── Atomic Transaction: Journal + Outbox ──
        return db.transaction(async (tx) => {
            const checksum = checksumEvidence(candidate.evidence.raw);
            const signalFingerprint = fingerprint(candidate, checksum);

            // Idempotency: check by (adapter, external_id) first
            if (candidate.evidence.provenance.externalId) {
                const existingByExternal = await tx.query.fluxcoreSignals.findFirst({
                    where: (t, { and, eq }) => and(
                        eq(t.certifiedByAdapter, candidate.certifiedBy.adapterId),
                        eq(t.provenanceExternalId, candidate.evidence.provenance.externalId!)
                    ),
                    columns: { sequenceNumber: true },
                });

                if (existingByExternal) {
                    return existingByExternal.sequenceNumber;
                }
            }

            // Insert into Journal
            const inserted = await tx.insert(fluxcoreSignals)
                .values({
                    signalFingerprint,
                    factType: candidate.factType,

                    sourceNamespace: candidate.source.namespace,
                    sourceKey: candidate.source.key,

                    subjectNamespace: candidate.subject?.namespace ?? null,
                    subjectKey: candidate.subject?.key ?? null,

                    objectNamespace: candidate.object?.namespace ?? null,
                    objectKey: candidate.object?.key ?? null,

                    evidenceRaw: candidate.evidence.raw,
                    evidenceFormat: candidate.evidence.format,
                    evidenceChecksum: checksum,

                    provenanceDriverId: candidate.evidence.provenance.driverId,
                    provenanceExternalId: candidate.evidence.provenance.externalId ?? null,
                    provenanceEntryPoint: candidate.evidence.provenance.entryPoint ?? null,

                    certifiedByAdapter: candidate.certifiedBy.adapterId,
                    certifiedAdapterVersion: adapterAllowed.adapterVersion,

                    claimedOccurredAt: candidate.evidence.claimedOccurredAt ?? null,
                })
                .onConflictDoNothing()
                .returning({ sequenceNumber: fluxcoreSignals.sequenceNumber });

            if (inserted.length > 0) {
                console.log(`[Diag][Kernel] message=${candidate.evidence.provenance.externalId || candidate.source.key} runtime=- decision=respond stage=ingest_stored seq=${inserted[0].sequenceNumber}`);
                // Transactional Outbox — same transaction, guaranteed
                // Usar estructura correcta: signalId en lugar de sequenceNumber
                await tx.insert(fluxcoreOutbox)
                    .values({
                        signalId: inserted[0].sequenceNumber,
                        eventType: 'kernel:signal_ingested',
                        payload: JSON.stringify({ 
                            sequenceNumber: inserted[0].sequenceNumber,
                            factType: candidate.factType,
                            adapterId: candidate.certifiedBy.adapterId
                        }),
                        status: 'pending'
                    })
                    .onConflictDoNothing();

                return inserted[0].sequenceNumber;
            }

            // Fingerprint collision → return existing sequence
            const existing = await tx.query.fluxcoreSignals.findFirst({
                where: (t, { eq }) => eq(t.signalFingerprint, signalFingerprint),
                columns: { sequenceNumber: true },
            });

            if (!existing) {
                throw new Error(
                    'Kernel invariant violation: fingerprint conflict but record not found'
                );
            }

            console.log(`[Diag][Kernel] message=${candidate.evidence.provenance.externalId || candidate.source.key} runtime=- decision=respond stage=ingest_duplicate seq=${existing.sequenceNumber}`);
            return existing.sequenceNumber;
        });
    }
}

export const kernel = new Kernel();

```

---
## 📁 types.ts

```typescript

import type { MessageContent } from '@fluxcore/db';
import type { ProcessMessageResult } from '../services/extension-host.service';
import type { TriggerEvaluation } from '../services/automation-controller.service';

export interface MessageEnvelope {
    id?: string;
    conversationId: string;
    senderAccountId: string;
    content: MessageContent;
    type: 'incoming' | 'outgoing' | 'system';
    generatedBy?: 'human' | 'ai' | 'system';
    timestamp?: Date;
    // Contexto adicional para extensiones
    targetAccountId?: string;  // La cuenta que recibe el mensaje
    userId?: string; // Usuario autenticado (para outbox)
    meta?: { // Metadatos para outbox
        ip?: string;
        userAgent?: string;
        clientTimestamp?: string;
        requestId?: string;
    };
}

export interface ReceiveResult {
    success: boolean;
    messageId?: string;
    error?: string;
    // Resultados del procesamiento de extensiones
    extensionResults?: ProcessMessageResult[];
    // COR-007: Información de automatización
    automation?: TriggerEvaluation;
}

// ═══════════════════════════════════════════════════════════
// RFC-0001 — Kernel Public Types
// The ONLY types the Kernel recognizes.
// ═══════════════════════════════════════════════════════════

/**
 * ActorRef: minimal identity hint for subject/object.
 * Contains ONLY namespace + key. Display names live in projectors.
 */
export type ActorRef = {
    namespace: string;
    key: string;
};

/**
 * SourceRef: causal origin of the observation.
 * Required on every signal — even if no actor is discernible.
 */
export type SourceRef = {
    namespace: string;
    key: string;
};

/**
 * Evidence: the raw physical observation.
 * Contains the original payload, format, and provenance.
 */
export interface Evidence {
    raw: unknown;
    format: string;
    provenance: {
        driverId: string;
        externalId?: string;
        entryPoint?: string;
    };
    claimedOccurredAt?: Date;
}

/**
 * ExternalObservation: what a driver reports before interpretation.
 * A Reality Adapter transforms this into a KernelCandidateSignal.
 */
export interface ExternalObservation {
    driverId: string;
    payload: unknown;
    receivedAt: Date;
}

/**
 * PhysicalFactType: the 6 immutable classes of physical observation.
 * The Kernel ONLY accepts these. Business semantics live in projectors.
 */
export type PhysicalFactType =
    | 'EXTERNAL_INPUT_OBSERVED'
    | 'EXTERNAL_STATE_OBSERVED'
    | 'DELIVERY_SIGNAL_OBSERVED'
    | 'MEDIA_CAPTURED'
    | 'SYSTEM_TIMER_ELAPSED'
    | 'CONNECTION_EVENT_OBSERVED'
    | 'chatcore.message.received';

/**
 * KernelCandidateSignal: the ONLY input the Kernel accepts.
 * Produced exclusively by registered Reality Adapters (SENSOR/GATEWAY).
 * INTERPRETER adapters cannot produce these.
 */
export interface KernelCandidateSignal {
    factType: PhysicalFactType;
    source: SourceRef;
    subject?: ActorRef;
    object?: ActorRef;
    evidence: Evidence;
    certifiedBy: {
        adapterId: string;
        adapterVersion: string;
        signature: string;
    };
}

```

---
## 📁 message-core.ts

```typescript
import { messageService } from '../services/message.service';
import { conversationService } from '../services/conversation.service';
import { relationshipService } from '../services/relationship.service';
import { conversationParticipantService } from '../services/conversation-participant.service';

import { coreEventBus } from './events';
import type { MessageEnvelope, ReceiveResult } from './types';

export { MessageEnvelope, ReceiveResult }; // Re-export para compatibilidad (opcional)

/**
 * MessageCore - El corazón del sistema de mensajería
 * 
 * Responsabilidades:
 * 1. Recibir mensajes de cualquier fuente (adapter, UI)
 * 2. Persistir inmediatamente
 * 3. Encolar certificación en outbox (garantiza entrega)
 * 4. Notificar via WebSocket (delegado a NotificationService)
 * 5. Actualizar metadatos de conversación
 * 6. Actualizar última interacción en relationship
 * 7. DELEGAR a ExtensionHost para procesamiento de extensiones (COR-001)
 * 
 * NO hace:
 * - Lógica de IA (eso es de extensiones)
 * - Orquestación compleja (eso es de extensiones)
 * - Validación de permisos (eso es middleware)
 * - Certificación directa (eso es del outbox worker)
 */
export class MessageCore {
  private relationshipNotificationCallbacks: Map<string, (data: any) => void> = new Map();
  private conversationNotificationCallbacks: Map<string, Set<(data: any) => void>> = new Map();
  // R-02.3: autoReplyQueue movida a MessageDispatchService (via Runtime Gateway)
  private conversations = new Map<string, { relationshipId: string | null; visitorToken?: string | null }>();
  private rooms: Map<string, any[]> = new Map();

  /**
   * Recibe y procesa un mensaje
   * COR-001: Ahora delega a ExtensionHost para que las extensiones procesen el mensaje
   * 🔥 NUEVO: Encola certificación en outbox para garantía de entrega
   */
  async receive(envelope: MessageEnvelope): Promise<ReceiveResult> {
    try {
      // 1. Persistir mensaje
      const message = await messageService.createMessage({
        conversationId: envelope.conversationId,
        senderAccountId: envelope.senderAccountId,
        content: envelope.content,
        type: envelope.type,
        generatedBy: envelope.generatedBy || 'human',
      });

      // 2. 🔥 NUEVO: Encolar para certificación si es mensaje humano
      if (envelope.generatedBy !== 'ai' && envelope.generatedBy !== 'system') {
        // Importar dinámicamente para evitar dependencias circulares
        const { chatCoreOutboxService } = await import('../services/chatcore-outbox.service');
        
        // Encolar async (no bloquea respuesta)
        setImmediate(async () => {
          try {
            await chatCoreOutboxService.enqueue({
              messageId: message.id,
              accountId: envelope.targetAccountId, // 🔑 Usar targetAccountId (cuenta del negocio receptor) - el sistema certifica en nombre del negocio
              userId: envelope.userId || envelope.senderAccountId,
              payload: envelope.content,
              meta: {
                ip: envelope.meta?.ip,
                userAgent: envelope.meta?.userAgent,
                clientTimestamp: envelope.meta?.clientTimestamp,
                conversationId: envelope.conversationId,
                requestId: envelope.meta?.requestId,
                humanSenderId: envelope.meta?.humanSenderId,
                messageId: message.id, // 🔑 Agregar messageId para vincular
              }
            });
          } catch (error) {
            console.error('[MessageCore] Outbox enqueue failed:', error);
          }
        });
      }

      // 3. Actualizar conversación y obtener datos
      const conversation = await conversationService.getConversationById(envelope.conversationId);
      if (conversation) {
        this.registerConversation(conversation.id, {
          relationshipId: conversation.relationshipId,
          visitorToken: conversation.visitorToken,
        });
        const messageText = typeof envelope.content?.text === 'string' ? envelope.content.text : '';
        await conversationService.updateConversation(envelope.conversationId, {
          lastMessageAt: new Date(),
          lastMessageText: messageText.substring(0, 500),
        });

        // 4. Actualizar última interacción en relationship
        if (conversation.relationshipId) {
          await relationshipService.updateLastInteraction(conversation.relationshipId);
        }

        // 5. Notificar via WebSocket
        if (conversation.relationshipId) {
          this.broadcastToRelationshipSubscribers(conversation.relationshipId, {
            type: 'message:new',
            data: {
              ...message,
              conversationId: envelope.conversationId,
              senderAccountId: envelope.senderAccountId,
              content: envelope.content,
            },
          });
        }

        this.broadcastToConversationSubscribers(envelope.conversationId, {
          type: 'message:new',
          data: {
            ...message,
            conversationId: envelope.conversationId,
            senderAccountId: envelope.senderAccountId,
            content: envelope.content,
          },
        });

        // 6. DELEGAR TODO A CONSUMIDORES (Desacoplado vía EventBus)
        // El núcleo solo emite el evento. FluxCore (IA) u otras extensiones
        // se "despertarán" escuchando este evento.
        const relationship = await relationshipService.getRelationshipById(conversation.relationshipId);
        if (relationship) {
          const targetAccountId = envelope.targetAccountId ||
            (envelope.senderAccountId === relationship.accountAId
              ? relationship.accountBId
              : relationship.accountAId);
          envelope.targetAccountId = targetAccountId;
        }
      }

      const result: ReceiveResult = {
        success: true,
        messageId: message.id,
      };

      // R-02.1: Emitir evento para desacoplar lógica (IA, Analytics)
      console.log(`[FluxPipeline] 📩 RECV  conv=${envelope.conversationId.slice(0,7)} sender=${envelope.senderAccountId?.slice(0,7)} type=${envelope.type} by=${envelope.generatedBy||'human'} → target=${envelope.targetAccountId?.slice(0,7) ?? 'UNKNOWN'}`);
      coreEventBus.emit('core:message_received', { envelope, result });

      return result;
    } catch (error: any) {
      console.error('MessageCore.receive error:', error);
      return {
        success: false,
        error: error.message || 'Failed to receive message',
      };
    }
  }

  /**
   * Envía un mensaje (alias de receive para consistencia de API)
   */
  async send(envelope: MessageEnvelope): Promise<ReceiveResult> {
    return this.receive(envelope);
  }

  /**
   * Obtiene el historial de mensajes de una conversación
   */
  async getHistory(conversationId: string, limit = 50, offset = 0) {
    return await messageService.getMessagesByConversationId(conversationId, limit, offset);
  }

  /**
   * Registra un callback para notificaciones
   */
  subscribeToRelationship(relationshipId: string, callback: (data: any) => void) {
    this.relationshipNotificationCallbacks.set(relationshipId, callback);
  }

  subscribeToConversation(conversationId: string, callback: (data: any) => void) {
    const callbacks = this.conversationNotificationCallbacks.get(conversationId) ?? new Set();
    callbacks.add(callback);
    this.conversationNotificationCallbacks.set(conversationId, callbacks);
  }

  /**
   * Desregistra un callback
   */
  unsubscribeFromRelationship(relationshipId: string) {
    this.relationshipNotificationCallbacks.delete(relationshipId);
  }

  unsubscribeFromConversation(conversationId: string, callback: (data: any) => void) {
    const callbacks = this.conversationNotificationCallbacks.get(conversationId);
    if (!callbacks) return;
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      this.conversationNotificationCallbacks.delete(conversationId);
    }
  }

  /**
   * Broadcast a todos los subscriptores de una relación
   */
  private broadcastToRelationshipSubscribers(relationshipId: string, data: any) {
    const callback = this.relationshipNotificationCallbacks.get(relationshipId);
    if (callback) {
      callback(data);
    } else {
      console.warn(`[MessageCore] broadcast: no relationshipNotificationCallback for relationship ${relationshipId}`);
    }
  }

  private broadcastToConversationSubscribers(conversationId: string, data: any) {
    const callbacks = this.conversationNotificationCallbacks.get(conversationId);
    if (!callbacks || callbacks.size === 0) {
      return;
    }
    callbacks.forEach(cb => cb(data));
  }

  registerConversation(
    conversationId: string,
    metadata: { relationshipId: string | null; visitorToken?: string | null }
  ) {
    this.conversations.set(conversationId, {
      relationshipId: metadata.relationshipId,
      visitorToken: metadata.visitorToken,
    });
    console.log(
      `[MessageCore] Registered conversation ${conversationId} (relationship=${metadata.relationshipId ?? 'none'}, visitorToken=${metadata.visitorToken ?? 'none'})`
    );
  }

  /**
   * Emit a WebSocket-only notification for a conversation (no DB persistence).
   * Used for transient notifications like ai_blocked that should not be stored.
   * Looks up the relationshipId from DB if not cached in-memory.
   */
  async broadcastToConversation(conversationId: string, data: any) {
    const participants = await conversationParticipantService.getActiveParticipants(conversationId);

    this.broadcastToConversationSubscribers(conversationId, data);

    const { broadcastToRelationship, broadcastToVisitor } = await import('../websocket/ws-handler');

    for (const participant of participants) {
      if (participant.visitorToken) {
        broadcastToVisitor(participant.visitorToken, data);
      }
    }

    let conv = this.conversations.get(conversationId);
    if (!conv) {
      const conversation = await conversationService.getConversationById(conversationId);
      if (conversation) {
        conv = {
          relationshipId: conversation.relationshipId,
          visitorToken: conversation.visitorToken,
        };
        this.conversations.set(conversationId, conv);
      }
    }

    if (conv?.relationshipId) {
      broadcastToRelationship(conv.relationshipId, data);
    }
  }

  /**
   * Transmite estado de actividad a participantes
   */
  broadcastActivity(conversationId: string, payload: any) {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      if (conv.relationshipId) {
        this.broadcastToRelationshipSubscribers(conv.relationshipId, {
          type: 'user_activity_state',
          ...payload,
          conversationId,
        });
      }
      this.broadcastToConversationSubscribers(conversationId, {
        type: 'user_activity_state',
        ...payload,
        conversationId,
      });
    } else {
      // Fallback: Broadcast to all connections in the conversation room
      console.warn(`[WARN] Broadcasting activity without registration for conversation ${conversationId}`);
      this.broadcastToRoom(conversationId, {
        type: 'user_activity_state',
        ...payload,
        conversationId
      });
    }
  }

  /**
   * Recibe mensaje desde cualquier adapter externo (WhatsApp, Telegram, etc.)
   * Normaliza y delega a receive() existente para persistencia y certificación
   */
  async receiveFromAdapter(message: any, channel: string): Promise<ReceiveResult> {
    try {
      console.log(`[MessageCore] 📥 Receiving ${channel} message from ${message.from?.phone || message.from?.id || 'unknown'}`);
      
      // 1. Resolver conversación (existente o nueva)
      const conversationId = await this.resolveConversationForAdapter(message, channel);
      
      // 2. Resolver cuenta (existente, anónima, o nueva)
      const senderAccountId = await this.resolveAccountForAdapter(message.from, channel);
      
      // 3. Construir envelope estandar
      const envelope: MessageEnvelope = {
        conversationId,
        senderAccountId,
        targetAccountId: await this.resolveTargetAccount(conversationId),
        content: message.content,
        type: 'incoming',
        generatedBy: 'human',
        userId: senderAccountId, // 🔧 CORRECCIÓN: Usar siempre senderAccountId (UUID válido)
        meta: {
          channel,
          externalId: message.externalId,
          ip: message.meta?.ip,
          userAgent: message.meta?.userAgent,
          clientTimestamp: message.timestamp,
        }
      };

      // 4. Delegar a receive() existente (persistencia + outbox + certificación)
      const result = await this.receive(envelope);
      
      console.log(`[MessageCore] ✅ Processed ${channel} message: ${result.messageId}`);
      return result;
      
    } catch (error) {
      console.error(`[MessageCore] ❌ Failed to process ${channel} message:`, error);
      throw error;
    }
  }

  private async resolveConversationForAdapter(message: any, channel: string): Promise<string> {
    // Para adapters externos, creamos conversación anónima inicialmente
    // El sistema la promoverá a relationship si se identifica el usuario
    const visitorToken = `visitor_${channel}_${message.externalId}`;
    
    try {
      const conversation = await conversationService.ensureConversation({
        visitorToken,
        channel: channel as 'web' | 'whatsapp' | 'telegram'
      });
      
      console.log(`[MessageCore] 📍 Resolved conversation: ${conversation.id} for visitor: ${visitorToken}`);
      return conversation.id;
    } catch (error) {
      console.error(`[MessageCore] ❌ Failed to resolve conversation:`, error);
      throw error;
    }
  }

  private async resolveAccountForAdapter(from: any, channel: string): Promise<string> {
    // Para adapters externos, usamos visitor token como cuenta provisional
    // El IdentityProjector promoverá a cuenta real si corresponde
    if (!from?.id) {
      // Usuario completamente anónimo
      return `visitor:${crypto.randomUUID()}`;
    }

    // Usuario con ID externo pero no registrado aún
    return `visitor_${channel}_${from.id}`;
  }

  private async resolveTargetAccount(conversationId: string): Promise<string | undefined> {
    // 🔑 CRÍTICO PARA FASE 2: Obtener targetAccountId desde conversation_participants
    // El target es la cuenta del negocio (role = 'recipient')
    try {
      const { conversationParticipantService } = await import('../services/conversation-participant.service');
      const recipient = await conversationParticipantService.getRecipient(conversationId);
      return recipient?.accountId;
    } catch (error) {
      console.error('[MessageCore] ❌ Error resolving target account:', error);
      return undefined;
    }
  }

  private broadcastToRoom(roomId: string, message: any) {
    const connections = this.rooms.get(roomId) || [];
    connections.forEach(conn => {
      conn.send(JSON.stringify(message));
    });
  }
}

export const messageCore = new MessageCore();

```

---
## 📁 chat-projector.ts

```typescript
import { BaseProjector } from '../kernel/base.projector';
import { conversationService } from '../../services/conversation.service';
import {
    db,
    relationships,
    and,
    eq,
    fluxcoreSignals,
    fluxcoreAddresses,
    fluxcoreActorAddressLinks,
    messages,
    fluxcoreCognitionQueue,
    conversations,
    fluxcoreActors,
} from '@fluxcore/db';
import { sql, isNull } from 'drizzle-orm';
import { coreEventBus } from '../events';

type TransactionClient = typeof db;

type EvidencePayload = {
    accountPerspective?: string;
    accountId?: string;
    tenantId?: string;
    visitorToken?: string;
    meta?: { humanSenderId?: string };
    content?: { text?: string };
    text?: string;
    body?: string;
    context?: { conversationId?: string };
};

interface ParsedEvidence {
    payload: EvidencePayload;
    raw: Record<string, unknown>;
}

/**
 * ChatProjector — RFC-0001 §5.9
 *
 * DETERMINISTIC BUSINESS PROJECTION
 * 
 * Materializes Journal facts into conversation memory.
 * Ensures physical idempotency via signal_id UNIQUE constraint.
 */
export class ChatProjector extends BaseProjector {
    protected projectorName = 'chat';

    // Turn-window constants (ms)
    private readonly TURN_WINDOW_MS = 3000;          // Default window after a message
    private readonly TYPING_EXTENSION_MS = 5000;     // Extension when user is typing

    protected async project(signal: typeof fluxcoreSignals.$inferSelect, tx: TransactionClient): Promise<void> {
        console.log(`[ChatProjector] ▶️ Processing signal #${signal.sequenceNumber} (${signal.factType})`);
        switch (signal.factType) {
            case 'chatcore.message.received':
                return this.projectMessage(signal, tx);
            case 'EXTERNAL_INPUT_OBSERVED':
                return this.projectMessage(signal, tx);
            case 'EXTERNAL_STATE_OBSERVED':
                return this.projectStateChange(signal, tx);
            case 'CONNECTION_EVENT_OBSERVED':
                return this.projectConnectionEvent(signal, tx);
            default:
                console.log(`[ChatProjector] ℹ️ Signal #${signal.sequenceNumber} ignored (fact type ${signal.factType}).`);
                return;
        }
    }

    /**
     * Handle identity-link events from the webchat widget.
     * Updates the conversation's linked_account_id.
     * AND NOW: Materializes the relationship and links the conversation.
     */
    private async projectConnectionEvent(signal: typeof fluxcoreSignals.$inferSelect, tx: TransactionClient): Promise<void> {
        // Only handle webchat identity-link events
        if (signal.subjectNamespace !== 'chatcore/webchat-visitor') {
            return;
        }

        const visitorToken = signal.subjectKey;
        const realAccountId = signal.objectKey;

        // Extract tenantId from evidence to create the relationship
        const evidence = this.parseEvidence(signal);
        const tenantId = evidence.payload.tenantId;

        if (!visitorToken || !realAccountId || !tenantId) {
            console.warn(`[ChatProjector] CONNECTION_EVENT Seq #${signal.sequenceNumber} — missing required data`, { visitorToken, realAccountId, tenantId });
            return;
        }

        const client = tx;

        // Find the conversation linked to this visitor_token
        const [conversation] = await client.select().from(conversations)
            .where(eq(conversations.visitorToken, visitorToken))
            .limit(1);

        if (!conversation) {
            console.log(`[ChatProjector] CONNECTION_EVENT Seq #${signal.sequenceNumber} — no conversation found for visitor ${visitorToken}`);
            return;
        }

        // 1. Create/Find Real Relationship (Tenant <-> Real Account)
        let [rel] = await client.select().from(relationships)
            .where(and(
                eq(relationships.accountAId, tenantId),
                eq(relationships.accountBId, realAccountId)
            ))
            .limit(1);

        if (!rel) {
            // Find actor for the real account to link properly
            const [actor] = await client.select().from(fluxcoreActors)
                .where(eq(fluxcoreActors.externalKey, visitorToken))
                .limit(1);
            
            const [newRel] = await client.insert(relationships).values({
                accountAId: tenantId,
                accountBId: realAccountId,
                actorId: actor?.id,
                perspectiveB: {
                    saved_name: 'Identified Visitor',
                    tags: ['visitor-converted'],
                    status: 'active'
                }
            }).returning();
            rel = newRel;
            console.log(`[ChatProjector] Created real relationship ${rel.id} for connection event (actor: ${actor?.id})`);
        }

        // 2. Link Conversation to Relationship
        await client
            .update(conversations)
            .set({
                relationshipId: rel.id, // Now we have a relationship!
                linkedAccountId: realAccountId,
                identityLinkedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversation.id));

        console.log(`[ChatProjector] CONNECTION_EVENT Seq #${signal.sequenceNumber} — conversation ${conversation.id} linked to account ${realAccountId} and relationship ${rel.id}`);
    }

    /**
     * Handle user state changes (typing, recording, idle).
     * Extends the turn window WITHOUT creating a message.
     */
    private async projectStateChange(signal: typeof fluxcoreSignals.$inferSelect, tx: any): Promise<void> {
        // ... (unchanged)
        const evidence = this.parseEvidence(signal);
        const raw = evidence.raw;

        // Only extend window for "typing" or "recording" activities
        const activity = (raw.activity as string | undefined) ?? (raw.status as string | undefined);
        if (activity !== 'typing' && activity !== 'recording') {
            return;
        }

        const accountId = evidence.payload.accountPerspective ?? evidence.payload.accountId ?? (raw.accountId as string | undefined);
        if (!accountId) return;

        const client = tx;

        // Find any pending cognition entry for this account
        const pending = await client.query.fluxcoreCognitionQueue.findFirst({
            where: and(
                eq(fluxcoreCognitionQueue.accountId, accountId),
                sql`fluxcore_cognition_queue.processed_at IS NULL`
            )
        });

        if (!pending) {
            // No pending turn — user is typing but no message has arrived yet. Safe to ignore.
            console.log(`[ChatProjector] Typing signal Seq #${signal.sequenceNumber} — no pending turn, skipping`);
            return;
        }

        // Extend the turn window: the user is still composing
        await client.update(fluxcoreCognitionQueue)
            .set({
                turnWindowExpiresAt: new Date(Date.now() + this.TYPING_EXTENSION_MS),
                lastSignalSeq: signal.sequenceNumber,
            })
            .where(and(
                eq(fluxcoreCognitionQueue.id, pending.id),
                sql`fluxcore_cognition_queue.processed_at IS NULL`
            ));

        console.log(`[ChatProjector] Typing Seq #${signal.sequenceNumber} — extended turn window by ${this.TYPING_EXTENSION_MS}ms for conversation ${pending.conversationId}`);
    }

    /**
     * Handle incoming messages (text, media, etc).
     * SOLO correlaciona con mensaje existente, no crea nuevos.
     */
    private async projectMessage(signal: typeof fluxcoreSignals.$inferSelect, tx: TransactionClient): Promise<void> {
        console.log(`[ChatProjector] 🔍 Starting message projection for signal #${signal.sequenceNumber}`);
        
        // Need a subject to resolve identity
        if (!signal.subjectNamespace || !signal.subjectKey) {
            console.log(`[ChatProjector] ⚠️ Signal #${signal.sequenceNumber} missing subject, skipping`);
            return;
        }

        const client = tx;

        // RETRY LOGIC: IdentityProjector might be slightly behind or parallel
        let address;
        let link;
        let attempts = 0;
        const maxAttempts = 3;

        console.log(`[ChatProjector] 🔍 Resolving identity for signal #${signal.sequenceNumber} (driver: ${signal.provenanceDriverId}, subject: ${signal.subjectKey})`);

        while (attempts < maxAttempts) {
            // Resolve ActorId from the IdentityProjector's tables
            address = await client.query.fluxcoreAddresses.findFirst({
                where: and(
                    eq(fluxcoreAddresses.driverId, signal.provenanceDriverId),
                    eq(fluxcoreAddresses.externalId, signal.subjectKey)
                )
            });

            if (address) {
                link = await client.query.fluxcoreActorAddressLinks.findFirst({
                    where: eq(fluxcoreActorAddressLinks.addressId, address.id)
                });
            }

            if (address && link) break;

            // Wait before retry
            attempts++;
            if (attempts < maxAttempts) {
                console.log(`[ChatProjector] 🔄 Retry ${attempts}/${maxAttempts} for signal #${signal.sequenceNumber}`);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        if (!address) {
            console.error(`[ChatProjector] ❌ Identity (Address) not yet resolved for Seq #${signal.sequenceNumber} after ${maxAttempts} attempts. Driver=${signal.provenanceDriverId} Key=${signal.subjectKey}`);
            throw new Error(`[ChatProjector] Identity (Address) not yet resolved for Seq #${signal.sequenceNumber} after ${maxAttempts} attempts. Driver=${signal.provenanceDriverId} Key=${signal.subjectKey}`);
        }

        if (!link) {
             console.error(`[ChatProjector] ❌ Identity (Link) not found for Seq #${signal.sequenceNumber} (Address: ${address.id})`);
             throw new Error(`[ChatProjector] Identity (Link) not found for Seq #${signal.sequenceNumber} (Address: ${address.id})`);
        }

        console.log(`[ChatProjector] ✅ Identity resolved for signal #${signal.sequenceNumber} (address: ${address.id}, link: ${link.id})`);

        // Extract business context from evidence
        const evidence = this.parseEvidence(signal);
        // WES-180: WebchatGateway sends tenantId, others send accountId or accountPerspective
        const accountId = evidence.payload.accountPerspective ?? evidence.payload.accountId ?? evidence.payload.tenantId;
        const visitorToken = evidence.payload.visitorToken;

        if (!accountId) {
            console.log(`[ChatProjector] Seq #${signal.sequenceNumber} — no account perspective (or tenantId), skipping`);
            return;
        }

        // 🔥 NUEVO: Solo correlacionar, no crear mensaje
        // Buscar mensaje existente por conversation + sender + timestamp
        const signalTime = signal.claimedOccurredAt || signal.observedAt;
        const timeWindow = new Date(signalTime.getTime() - 10 * 60 * 1000); // 10 minutos antes (aumentado de 5)
        
        console.log(`[ChatProjector] 🔍 Searching for message to correlate with signal #${signal.sequenceNumber}`);
        console.log(`[ChatProjector] 📊 Search criteria: accountId=${accountId}, timeWindow=${timeWindow.toISOString()}`);
        
        // Obtener conversationId desde evidence para evitar cruces entre conversaciones
        const conversationId = evidence.payload.context?.conversationId;
        
        let query = client.select()
            .from(messages)
            .where(eq(messages.senderAccountId, accountId))
            .where(sql`${messages.createdAt} >= ${timeWindow}`)
            .where(isNull(messages.signalId));
            
        // Agregar filtro por conversationId si está disponible
        if (conversationId) {
            query = query.where(eq(messages.conversationId, conversationId));
        }
        
        const [existingMessage] = await query.limit(1);

        if (existingMessage) {
            // Correlacionar con signal
            await client.update(messages)
                .set({ signalId: signal.sequenceNumber })
                .where(eq(messages.id, existingMessage.id));
                
            console.log(`[ChatProjector] ✅ Correlated message ${existingMessage.id} with signal #${signal.sequenceNumber}`);
            
            // Encolar en cognition_queue para procesamiento de FluxCore
            await this.enqueueForCognition(existingMessage.conversationId, accountId, signal.sequenceNumber, tx);
        } else {
            // No hay mensaje para correlacionar - esto es normal si el mensaje aún no fue persistido
            console.log(`[ChatProjector] ℹ️ No message found for signal #${signal.sequenceNumber} - will retry on next processing`);
            console.log(`[ChatProjector] 📊 Signal time: ${signalTime.toISOString()}, Search window: ${timeWindow.toISOString()}`);
            return;
        }
    }

    private async projectCommunication(
        signal: typeof fluxcoreSignals.$inferSelect,
        actorId: string,
        accountId: string,
        evidence: ParsedEvidence,
        tx: TransactionClient,
        visitorToken?: string
    ) {
        const client = tx;

        // 1. Usar mundo definido por ChatCoreGateway (autoridad centralizada)
        const worldContext = signal.evidenceRaw?.meta;
        const channel = worldContext?.channel || 'unknown';
        const source = worldContext?.source || 'unknown';
        const priority = worldContext?.priority || 'normal';
        const routing = worldContext?.routing || { requiresAi: true, skipProcessing: false };
        
        console.log(`[ChatProjector] 🌍 Using world from Gateway: channel=${channel}, source=${source}, priority=${priority} for signal #${signal.sequenceNumber}`);
        
        // 2. Aplicar routing definido por Gateway
        if (routing.skipProcessing) {
            console.log(`[ChatProjector] ⏭️  SKIP PROCESSING: routing.skipProcessing=true for signal #${signal.sequenceNumber}`);
            return;
        }
        
        // 3. Validación de contexto
        if (channel === 'unknown') {
            console.warn(`[ChatProjector] ⚠️ Unknown channel for signal #${signal.sequenceNumber} - worldContext: ${JSON.stringify(worldContext)}`);
        }

        // 2. Resolve Conversation
        const conversationId = evidence.payload.context?.conversationId;
        let conversation;

        if (conversationId) {
            // CONVERSATION EXISTS: Use it (flujo interno continuo)
            const [existing] = await client.select().from(conversations)
                .where(eq(conversations.id, conversationId))
                .limit(1);
            
            if (existing) {
                conversation = existing;
                
                // Check if relationship exists for this conversation
                const [rel] = await client.select().from(relationships)
                    .where(eq(relationships.id, existing.relationshipId))
                    .limit(1);
                
                if (rel) {
                    // Relationship exists (Internal chat or previously linked visitor)
                    conversation = await conversationService.ensureConversation({
                        relationshipId: rel.id,
                        channel
                    }, client);
                } else {
                    // No relationship found
                    if (visitorToken) {
                        // VISITOR FLOW: Create conversation bound to Owner + VisitorToken
                        conversation = await conversationService.ensureConversation({
                            visitorToken,
                            channel
                        }, client);
                    } else {
                        // INTERNAL FLOW WITHOUT RELATIONSHIP: Skip projection
                        console.warn(`[ChatProjector] Seq #${signal.sequenceNumber} — No relationship found for internal flow (actor=${actorId}, account=${accountId}). Skipping.`);
                        return;
                    }
                }
            } else {
                console.warn(`[ChatProjector] Seq #${signal.sequenceNumber} — conversationId in evidence but not found in DB. Creating new.`);
                return;
            }
        }
    }

    /**
     * Enqueue for cognition processing
     */
    private async enqueueForCognition(conversationId: string, accountId: string, signalSequence: bigint, tx: TransactionClient): Promise<void> {
        const expiresAt = new Date(Date.now() + this.TURN_WINDOW_MS);
        
        await tx.execute(sql`
            INSERT INTO fluxcore_cognition_queue (
                conversation_id, 
                account_id, 
                last_signal_seq, 
                turn_started_at, 
                turn_window_expires_at
            )
            VALUES
                (${conversationId}, ${accountId}, ${signalSequence}, NOW(), ${expiresAt})
            ON CONFLICT (conversation_id) WHERE fluxcore_cognition_queue.processed_at IS NULL
            DO UPDATE SET
                last_signal_seq = EXCLUDED.last_signal_seq,
                turn_window_expires_at = EXCLUDED.turn_window_expires_at,
                processed_at = NULL
        `);

        // Wake up cognition worker immediately (event-driven)
        setImmediate(() => {
            coreEventBus.emit('kernel:cognition:wakeup', {
                conversationId,
                accountId,
            });
        });
    }

    private parseEvidence(signal: typeof fluxcoreSignals.$inferSelect): ParsedEvidence {
        let evidenceRoot: unknown = signal.evidenceRaw;

        if (typeof evidenceRoot === 'string') {
            try {
                evidenceRoot = JSON.parse(evidenceRoot);
            } catch (error) {
                console.error(`[ChatProjector] ❌ Failed to parse evidenceRaw for seq ${signal.sequenceNumber}`, error);
                evidenceRoot = {};
            }
        }

        if (evidenceRoot && typeof evidenceRoot === 'object' && 'raw' in evidenceRoot && typeof evidenceRoot.raw === 'object' && evidenceRoot.raw !== null) {
            return {
                payload: evidenceRoot as EvidencePayload,
                raw: evidenceRoot.raw as Record<string, unknown>,
            };
        }

        const payload = (evidenceRoot && typeof evidenceRoot === 'object') ? (evidenceRoot as EvidencePayload) : {};

        return {
            payload,
            raw: (evidenceRoot && typeof evidenceRoot === 'object') ? (evidenceRoot as Record<string, unknown>) : {},
        };
    }
}

export const chatProjector = new ChatProjector();

```

---
## 📁 base.projector.ts

```typescript
import { db, fluxcoreSignals, fluxcoreProjectorCursors, fluxcoreProjectorErrors, eq, gt, asc, sql, and } from '@fluxcore/db';

/**
 * BaseProjector — RFC-0001 §5.9, §5.11
 *
 * THE CLOSURE CONTRACT
 *
 * Every projector in FluxCore must extend this.
 * It ensures that the system is log-driven, not event-driven.
 *
 * Canon Invariants enforced here:
 *   1. Cursor advances ONLY inside the same transaction as the projection write.
 *   2. A failed signal is recorded in fluxcore_projector_errors (attempts++).
 *   3. The loop STOPS on the first failure — the signal will be retried on the
 *      next wakeUp. The system is blocked-but-consistent, never silently wrong.
 *   4. Full replay is possible by resetting cursors.
 *   5. Duplicate wake-ups are harmless (isProcessing guard).
 */
export abstract class BaseProjector {

    protected abstract projectorName: string;

    /**
     * The business logic of the projection.
     * Receives a raw Journal row and a transaction instance.
     * Must be idempotent.
     */
    protected abstract project(signal: typeof fluxcoreSignals.$inferSelect, tx: any): Promise<void>;

    private isProcessing = false;

    /**
     * Wakes up the projector to process all pending signals in the Journal.
     *
     * On success: cursor advances atomically with the projection (same tx).
     * On failure: error is recorded in fluxcore_projector_errors, loop stops.
     *             The cursor does NOT advance. Next wakeUp retries from same signal.
     */
    async wakeUp(): Promise<void> {
        if (this.isProcessing) return;

        this.isProcessing = true;

        try {
            const cursor = await this.getCursor();

            const batch = await db.query.fluxcoreSignals.findMany({
                where: gt(fluxcoreSignals.sequenceNumber, cursor),
                orderBy: [asc(fluxcoreSignals.sequenceNumber)],
                limit: 100,
            });

            if (batch.length === 0) {
                return;
            }

            console.log(`[BaseProjector:${this.projectorName}] Processing batch of ${batch.length} signals (Cursor: ${cursor})`);

            for (const signal of batch) {
                try {
                    // Canon Invariant: cursor update and projection write are atomic.
                    await db.transaction(async (tx) => {
                        await this.project(signal, tx);
                        await this.updateCursor(signal.sequenceNumber, tx);
                    });

                    // Resolve any prior error for this signal (it succeeded on retry)
                    await db
                        .update(fluxcoreProjectorErrors)
                        .set({ resolvedAt: new Date() })
                        .where(
                            and(
                                eq(fluxcoreProjectorErrors.projectorName, this.projectorName),
                                eq(fluxcoreProjectorErrors.signalSeq, signal.sequenceNumber),
                            )
                        );

                } catch (signalError) {
                    const errMsg = signalError instanceof Error ? signalError.message : String(signalError);
                    const errStack = signalError instanceof Error ? signalError.stack : undefined;

                    console.error(
                        `[BaseProjector:${this.projectorName}] ⛔ Signal #${signal.sequenceNumber} failed — cursor held, loop stopped. Will retry on next wakeUp.`,
                        signalError,
                    );

                    // Record / increment attempts. Cursor does NOT advance.
                    await db
                        .insert(fluxcoreProjectorErrors)
                        .values({
                            projectorName: this.projectorName,
                            signalSeq: signal.sequenceNumber,
                            errorMessage: errMsg,
                            errorStack: errStack,
                        })
                        .onConflictDoNothing();

                    // Stop processing — the next wakeUp will retry from this signal.
                    return;
                }
            }

            // If batch was full, there may be more signals — trigger another pass.
            if (batch.length === 100) {
                // Schedule non-blocking continuation so we don't block the event loop
                setImmediate(() => this.wakeUp());
            }

        } catch (error) {
            console.error(`[BaseProjector:${this.projectorName}] ❌ CRITICAL PROJECTION FAILURE:`, error);
        } finally {
            this.isProcessing = false;
        }
    }

    private async getCursor(): Promise<number> {
        const existing = await db.query.fluxcoreProjectorCursors.findFirst({
            where: eq(fluxcoreProjectorCursors.projectorName, this.projectorName),
        });

        if (!existing) {
            await db.insert(fluxcoreProjectorCursors).values({
                projectorName: this.projectorName,
                lastSequenceNumber: 0,
            });
            return 0;
        }

        return existing.lastSequenceNumber;
    }

    private async updateCursor(sequence: number, tx?: any): Promise<void> {
        const client = tx || db;
        await client
            .update(fluxcoreProjectorCursors)
            .set({ lastSequenceNumber: sequence })
            .where(eq(fluxcoreProjectorCursors.projectorName, this.projectorName));
    }
}

```

---
## 📁 chatcore-gateway.service.ts

```typescript
import { kernel } from '../../core/kernel';
import type { KernelCandidateSignal, Evidence } from '../../core/types';
import { signCandidate } from './kernel-utils';
import { ChatCoreWorldDefiner, type WorldContext } from '../../core/chatcore-world-definer';
import { db, sql } from '@fluxcore/db';
import crypto from 'node:crypto';

/**
 * ChatCore Reality Adapter (GATEWAY)
 * 
 * Este servicio actúa como la frontera causal entre el usuario y el Kernel.
 * Certifica que un humano intentó comunicarse a través de la interfaz de ChatCore.
 * 
 * NO depende de la base de datos de mensajes.
 * NO contiene lógica de negocio.
 * SOLO observa y certifica.
 */
export class ChatCoreGatewayService {
    // Identidad del observador
    private readonly ADAPTER_ID = 'chatcore-gateway';
    private readonly ADAPTER_VERSION = '1.0.0';
    private readonly DRIVER_ID = 'chatcore/internal';
    private readonly SIGNING_SECRET = process.env.CHATCORE_SIGNING_SECRET || 'fallback-secret';

    /**
     * 🔑 ESTRATEGIA CENTRALIZADA: Usar ChatCoreWorldDefiner
     * ChatCoreGateway delega la definición del mundo al componente centralizado
     */
    private defineWorldFromContext(params: any): WorldContext {
        const requestContext = {
            headers: params.meta?.headers || {},
            meta: params.meta || {},
            userAgent: params.meta?.userAgent,
            origin: params.meta?.origin,
            requestId: params.meta?.requestId,
            accountId: params.accountId,
            userId: params.userId
        };
        
        const worldContext = ChatCoreWorldDefiner.defineWorld(requestContext);
        
        console.log(`[ChatCoreGateway] 🌍 World defined: channel=${worldContext.channel}, source=${worldContext.source}, priority=${worldContext.priority}`);
        
        return worldContext;
    }

    /**
     * Certifica una intención de comunicación humana.
     * Debe llamarse DESPUÉS de validar el token de usuario pero ANTES de cualquier efecto.
     */
    async certifyIngress(params: {
        accountId: string; // The Business Account ID (must exist in accounts table)
        userId: string;   // The Authenticated User ID (required for audit)
        payload: any;
        meta: {
            conversationId?: string;
            requestId?: string;
            ip?: string;
            userAgent?: string;
            clientTimestamp?: string;
            humanSenderId?: string;
            messageId?: string; // Nuevo: ID del mensaje ya persistido en ChatCore
            type?: string;
            [key: string]: any;
        }
    }): Promise<{ 
        accepted: boolean; 
        signalId?: number; 
        reason?: string;
        messagePersisted?: boolean;
        kernelCertified?: boolean;
    }> {
        console.log(`[ChatCoreGateway] 🔍 certifyIngress called with:`, {
            hasAccountId: !!params.accountId,
            hasUserId: !!params.userId,
            hasPayload: !!params.payload,
            hasMeta: !!params.meta,
            metaKeys: params.meta ? Object.keys(params.meta) : 'undefined',
            metaConversationId: params.meta?.conversationId
        });

        // Validación temprana para evitar errores
        if (!params.accountId || !params.payload) {
            console.error(`[ChatCoreGateway] ❌ Missing required params: accountId=${!!params.accountId}, payload=${!!params.payload}`);
            return { accepted: false, reason: 'Missing required parameters: accountId or payload' };
        }

        try {
            // 1. Construir Evidencia Cruda (lo que el sistema VIÓ)
            const evidenceRaw = {
                accountId: params.accountId, // Required for IdentityProjector context
                content: params.payload,
                context: {
                    conversationId: params.meta?.conversationId,
                    userId: params.userId || params.accountId, // Fallback to account if no user
                },
                metadata: {
                    ip: params.meta?.ip,
                    userAgent: params.meta?.userAgent,
                    clientTimestamp: params.meta?.clientTimestamp,
                    requestId: params.meta?.requestId,
                },
                meta: {
                    humanSenderId: params.meta?.humanSenderId,
                    messageId: params.meta?.messageId, // Vincular con ChatCore
                    ...this.defineWorldFromContext(params).metadata, // 🔑 DEFINICIÓN CENTRALIZADA
                },
                security: {
                    authMethod: 'bearer_token',
                    scope: 'user' // TODO: Refine scope if needed
                }
            };

            // 2. Construir Evidence Struct
            const evidence: Evidence = {
                raw: evidenceRaw,
                format: 'json',
                provenance: {
                    driverId: this.DRIVER_ID,
                    externalId: params.meta.requestId || this.generateFallbackId(params),
                    entryPoint: 'api/messages', // Endpoint lógico
                },
                claimedOccurredAt: params.meta.clientTimestamp ? new Date(params.meta.clientTimestamp) : new Date(),
            };

            // 3. Definir Actores (Namespace @fluxcore/internal para usuarios del sistema)
            const actorRef = {
                namespace: '@fluxcore/internal',
                key: params.accountId // Identity is tied to the Account (UUID válido)
            };

            // 4. Construir Candidato a Señal
            const candidate: KernelCandidateSignal = {
                factType: 'chatcore.message.received',
                source: actorRef,   // El origen es el usuario
                subject: actorRef,  // El sujeto también es el usuario (auto-representado)
                evidence,
                certifiedBy: {
                    adapterId: this.ADAPTER_ID,
                    adapterVersion: this.ADAPTER_VERSION,
                    signature: '' // Se firma abajo
                }
            };

            // 5. Firmar Candidato
            candidate.certifiedBy.signature = signCandidate(candidate, this.SIGNING_SECRET);

            // 6. 🔑 SOBERANÍA: Persistir el mensaje en ChatCore PRIMERO
            const { messageService } = await import('../../services/message.service');
            const message = await messageService.createMessage({
                conversationId: params.meta?.conversationId || 'unknown',
                senderAccountId: params.accountId,
                content: params.payload,
                type: 'incoming',
                generatedBy: 'human'
            });

            console.log(`[ChatCoreGateway] 💾 Message persisted: ${message.id} - Proceeding with certification`);

            // 7. Solo si la persistencia fue exitosa, certificar en el Kernel
            let seq: number | undefined;
            try {
                seq = await kernel.ingestSignal(candidate);
                console.log(`[ChatCoreGateway] 👁️ Certified ingress from ${params.userId}. Signal #${seq}`);
                
                // 8. Vincular señal con mensaje persistido
            // Nota: messageService.updateMessage podría no tener signalId, usamos SQL directo
            await db.execute(sql`
                UPDATE messages 
                SET signal_id = ${seq} 
                WHERE id = ${message.id}
            `);
                
            } catch (kernelError: any) {
                // 🔑 SOBERANÍA: Si el Kernel falla, el mensaje ya existe en ChatCore
                // → No revertir el mensaje (ChatCore es dueño del mundo)
                // → FluxCore simplemente no procesará el mensaje (degradación aceptable)
                console.error(`[ChatCoreGateway] ⚠️ Kernel certification failed but message persisted:`, kernelError.message);
                console.log(`[ChatCoreGateway] 🌍 Message ${message.id} exists in ChatCore - FluxCore will not process it`);
                
                // Retornar éxito para el cliente (el mensaje fue recibido y persistido)
                // pero indicar que no fue certificado en el Kernel
                return { 
                    accepted: true, 
                    signalId: undefined, // No hay señal en Kernel
                    messagePersisted: true,
                    kernelCertified: false,
                    reason: `Message persisted but Kernel certification failed: ${kernelError.message}`
                };
            }

            return { accepted: true, signalId: seq, messagePersisted: true, kernelCertified: true };

        } catch (error: any) {
            console.error(`[ChatCoreGateway] ❌ Message persistence failed:`, error.message);
            // 🔑 SOBERANÍA: Si la persistencia en ChatCore falla, no hay nada que certificar
            // → El mensaje no existe en ChatCore, por lo tanto no hay realidad que certificar
            // → No se llama al Kernel bajo ninguna circunstancia
            return { accepted: false, reason: `Message persistence failed: ${error.message}` };
        }
    }

    /**
     * Genera un ID determinista si el cliente no envió uno.
     * HMAC(userId + contentHash + timestampBucket)
     */
    private generateFallbackId(params: { userId: string; payload: any; meta: any }): string {
        const contentHash = crypto.createHash('sha256')
            .update(JSON.stringify(params.payload))
            .digest('hex');
        
        // Bucket de 1 segundo para evitar colisiones en ráfagas muy rápidas
        // pero permitir reintentos en segundos distintos
        const timeBucket = Math.floor(Date.now() / 1000); 

        return crypto.createHash('sha256')
            .update(`${params.userId}:${contentHash}:${timeBucket}`)
            .digest('hex');
    }
}

export const chatCoreGateway = new ChatCoreGatewayService();

```

---
## 📁 chatcore-webchat-gateway.service.ts

```typescript
import { kernel } from '../../core/kernel';
import type { KernelCandidateSignal, Evidence } from '../../core/types';
import { signCandidate } from './kernel-utils';
import { chatCoreOutboxService } from '../../services/chatcore-outbox.service';
import crypto from 'node:crypto';

/**
 * ChatCore Webchat Reality Adapter (GATEWAY)
 *
 * Certifica observaciones desde el widget embebible.
 * La identidad del visitante puede ser provisional (visitor_token)
 * o real (autenticado).
 *
 * NO depende de la base de datos de mensajes.
 * NO contiene lógica de negocio.
 * SOLO observa y certifica.
 */
export class ChatCoreWebchatGatewayService {
    private readonly ADAPTER_ID = 'chatcore-webchat-gateway';
    private readonly ADAPTER_VERSION = '1.0.0';
    private readonly DRIVER_ID = 'chatcore/webchat';
    private readonly SIGNING_SECRET =
        process.env.WEBCHAT_SIGNING_SECRET || 'webchat-dev-secret-local';

    /**
     * B1 — Certifica un mensaje entrante desde el widget.
     * El visitante es identificado por su visitor_token (provisional).
     */
    async certifyIngress(params: {
        visitorToken: string;   // Provisional identity
        tenantId: string;       // Account that owns the widget
        payload: any;
        meta: {
            ip?: string;
            userAgent?: string;
            clientTimestamp?: string;
            conversationId?: string;
            requestId?: string;
        };
    }): Promise<{ 
        accepted: boolean; 
        signalId?: number; 
        reason?: string;
        messagePersisted?: boolean;
        messageEnqueued?: boolean;
        messageId?: string;
        certification?: 'sync' | 'async';
    }> {
        try {
            const evidenceRaw = {
                visitorToken: params.visitorToken,
                tenantId: params.tenantId,
                content: params.payload,
                context: {
                    conversationId: params.meta.conversationId,
                },
                metadata: {
                    ip: params.meta.ip,
                    userAgent: params.meta.userAgent,
                    clientTimestamp: params.meta.clientTimestamp,
                    requestId: params.meta.requestId,
                },
                security: {
                    authMethod: 'visitor_token',
                    scope: 'anonymous',
                },
            };

            const evidence: Evidence = {
                raw: evidenceRaw,
                format: 'json',
                provenance: {
                    driverId: this.DRIVER_ID,
                    externalId: params.meta.requestId || this.generateFallbackId(params.visitorToken, params.payload),
                    entryPoint: 'widget/message',
                },
                claimedOccurredAt: params.meta.clientTimestamp
                    ? new Date(params.meta.clientTimestamp)
                    : new Date(),
            };

            const sourceRef = {
                namespace: 'chatcore/webchat-visitor',
                key: params.visitorToken,
            };

            const candidate: KernelCandidateSignal = {
                factType: 'EXTERNAL_INPUT_OBSERVED',
                source: sourceRef,
                subject: sourceRef,
                evidence,
                certifiedBy: {
                    adapterId: this.ADAPTER_ID,
                    adapterVersion: this.ADAPTER_VERSION,
                    signature: '',
                },
            };

            candidate.certifiedBy.signature = this.signCandidate(candidate);

            // 🔑 OUTBOX PATTERN: Persistir mensaje primero, luego encolar para certificación
            try {
                // 1. Crear mensaje en ChatCore (dentro de transacción)
                const { messageService } = await import('../../services/message.service');
                const message = await messageService.createMessage({
                    conversationId: params.meta.conversationId || 'unknown',
                    senderAccountId: 'visitor', // Visitor messages don't have account yet
                    content: params.payload,
                    type: 'incoming',
                    generatedBy: 'human'
                });

                console.log(`[WebchatGateway] 💾 Visitor message persisted: ${message.id}`);

                // 2. Encolar en outbox para certificación asíncrona
                await chatCoreOutboxService.enqueue({
                    messageId: message.id,
                    accountId: params.tenantId,
                    userId: params.visitorToken,
                    payload: {
                        ...candidate,
                        // Metadata para el worker
                        messageType: 'visitor_widget',
                        visitorToken: params.visitorToken,
                        tenantId: params.tenantId
                    },
                    meta: {
                        ip: params.meta.ip,
                        userAgent: params.meta.userAgent,
                        clientTimestamp: params.meta.clientTimestamp,
                        conversationId: params.meta.conversationId,
                        requestId: params.meta.requestId,
                        messageId: message.id
                    }
                });

                console.log(`[WebchatGateway] 📮 Message enqueued for certification: ${message.id}`);
                
                return { 
                    accepted: true, 
                    messagePersisted: true,
                    messageEnqueued: true,
                    messageId: message.id,
                    certification: 'async' // Indicar que la certificación es asíncrona
                };

            } catch (error: any) {
                console.error('[WebchatGateway] ❌ Message persistence failed:', error.message);
                return { accepted: false, reason: `Message persistence failed: ${error.message}` };
            }

        } catch (error: any) {
            console.error(`[WebchatGateway] ❌ Certification failed:`, error.message);
            return { accepted: false, reason: error.message };
        }
    }

    /**
     * B2 — Certifica un evento de vinculación de identidad.
     * El visitante provisional se autentica y vincula a una cuenta real.
     */
    async certifyConnectionEvent(params: {
        visitorToken: string;   // Provisional actor (subject)
        realAccountId: string;  // Real account after authentication (object)
        tenantId: string;
        meta: {
            ip?: string;
            userAgent?: string;
            clientTimestamp?: string;
            requestId?: string;
        };
    }): Promise<{ 
        accepted: boolean; 
        signalId?: number; 
        reason?: string;
        certification?: 'sync' | 'async';
    }> {
        try {
            const evidenceRaw = {
                visitorToken: params.visitorToken,
                realAccountId: params.realAccountId,
                tenantId: params.tenantId,
                event: 'visitor_authenticated',
                metadata: {
                    ip: params.meta.ip,
                    userAgent: params.meta.userAgent,
                    requestId: params.meta.requestId,
                },
            };

            const evidence: Evidence = {
                raw: evidenceRaw,
                format: 'json',
                provenance: {
                    driverId: this.DRIVER_ID,
                    externalId: params.meta.requestId || this.generateFallbackId(params.visitorToken, params.realAccountId),
                    entryPoint: 'widget/identity-link',
                },
                claimedOccurredAt: new Date(),
            };

            const candidate: KernelCandidateSignal = {
                factType: 'CONNECTION_EVENT_OBSERVED',
                source: {
                    namespace: 'chatcore/webchat-gateway',
                    key: params.tenantId,
                },
                subject: {
                    namespace: 'chatcore/webchat-visitor',
                    key: params.visitorToken,
                },
                object: {
                    namespace: 'chatcore/account',
                    key: params.realAccountId,
                },
                evidence,
                certifiedBy: {
                    adapterId: this.ADAPTER_ID,
                    adapterVersion: this.ADAPTER_VERSION,
                    signature: '',
                },
            };

            candidate.certifiedBy.signature = this.signCandidate(candidate);

            // 🔑 OUTBOX PATTERN: Para eventos de conexión, usar certificación síncrona (no hay mensaje)
            const seq = await kernel.ingestSignal(candidate);
            console.log(`[WebchatGateway] 🔗 Identity link certified: visitor ${params.visitorToken} → account ${params.realAccountId}. Signal #${seq}`);
            return { 
                accepted: true, 
                signalId: seq,
                certification: 'sync'
            };

        } catch (error: any) {
            console.error(`[WebchatGateway] ❌ Connection event certification failed:`, error.message);
            return { accepted: false, reason: error.message };
        }
    }

    private generateFallbackId(key: string, payload: any): string {
        const contentHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(payload))
            .digest('hex');
        const timeBucket = Math.floor(Date.now() / 1000);
        return crypto
            .createHash('sha256')
            .update(`${key}:${contentHash}:${timeBucket}`)
            .digest('hex');
    }

    private signCandidate(candidate: KernelCandidateSignal): string {
        const canonical = this.canonicalize({
            factType: candidate.factType,
            source: candidate.source,
            subject: candidate.subject ?? null,
            object: candidate.object ?? null,
            evidence: candidate.evidence,
            adapterId: candidate.certifiedBy.adapterId,
            adapterVersion: candidate.certifiedBy.adapterVersion,
        });

        return crypto
            .createHmac('sha256', this.SIGNING_SECRET)
            .update(canonical)
            .digest('hex');
    }

    private canonicalize(value: unknown): string {
        if (value === null || typeof value !== 'object') {
            return JSON.stringify(value);
        }

        if (Array.isArray(value)) {
            return '[' + value.map(v => this.canonicalize(v)).join(',') + ']';
        }

        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

        return '{' + entries
            .map(([key, val]) => JSON.stringify(key) + ':' + this.canonicalize(val))
            .join(',') + '}';
    }
}

export const chatCoreWebchatGateway = new ChatCoreWebchatGatewayService();

```

---
## 📁 reality-adapter.service.ts

```typescript
import crypto from 'node:crypto';
import { kernel } from '../../core/kernel';
import type { KernelCandidateSignal, PhysicalFactType } from '../../core/types';
import { messageCore } from '../../core/message-core';
import type { NormalizedMessage, NormalizedStatusEvent } from '../../../../../packages/adapters/src';

// Constants matching the bootstrapped adapter in DB
const ADAPTER_ID = 'fluxcore/whatsapp-gateway';
const ADAPTER_VERSION = '1.0.0-rfc0001';
const SIGNING_SECRET = 'development_signing_secret_wa'; // Matches bootstrap-wa-adapter.sql

/**
 * RealityAdapterService
 *
 * The Gateway between the dirty external world (Drivers)
 * and the sovereign internal world (Kernel).
 *
 * Responsibilities:
 * 1. Receive NormalizedMessage from drivers
 * 2. Translate to Physical Fact (Ontology)
 * 3. Sign with authorized secret
 * 4. Submit to Kernel for certification
 */
export class RealityAdapterService {

    /**
     * Process an external observation (driver message) into a certified Fact.
     */
    async processExternalObservation(message: NormalizedMessage): Promise<number> {

        console.log(`[Diag][Adapter] message=${message.externalId || message.id || 'unknown'} runtime=- decision=respond stage=received channel=${message.channel}`);
        // 1. Ontology Mapping
        const factType = this.resolveFactType(message);

        // 2. Construct Candidate Signal
        const signal: KernelCandidateSignal = {
            factType,

            // Source: Causal origin (Technical channel)
            source: {
                namespace: 'channel',
                key: `${message.channel}/${message.externalId}`
            },

            // Subject: The external actor (if identified by driver)
            subject: message.from?.id ? {
                namespace: `${message.channel}/user`,
                key: message.from.id
            } : undefined,

            // Object: The target system/resource (if applicable)
            object: message.to?.id ? {
                namespace: `${message.channel}/system`,
                key: message.to.id
            } : undefined,

            // Evidence: THE RAW TRUTH
            evidence: {
                raw: message,
                format: 'normalized_message_v1',
                provenance: {
                    driverId: `@fluxcore/${message.channel}`, // Must match DB driver_id
                    externalId: message.externalId,
                    entryPoint: message.to?.id // Hint for tenant resolution
                },
                claimedOccurredAt: message.timestamp
            },

            // Certification
            certifiedBy: {
                adapterId: ADAPTER_ID,
                adapterVersion: ADAPTER_VERSION,
                signature: '' // Signed below
            }
        };

        // 3. Sign the Signal
        signal.certifiedBy.signature = this.signSignal(signal);

        // 🔑 DELEGAR A CHATCORE: Usar messageCore para procesamiento correcto
        console.log(`[Diag][Adapter->Kernel] message=${message.externalId || message.id || 'unknown'} runtime=- decision=respond fact=${factType} stage=certify`);
        console.log(`[RealityAdapter] 📡 Delegating ${factType} from ${message.from.id} to ChatCore...`);
        
        // Delegar a ChatCore para persistencia → outbox → certificación
        try {
            await messageCore.receiveFromAdapter(message, message.channel);
            console.log(`[RealityAdapter] ✅ Message delegated to ChatCore for processing`);
            return 0; // Placeholder - ChatCore maneja la certificación
        } catch (error) {
            console.error(`[RealityAdapter] ❌ Failed to delegate to ChatCore:`, error);
            throw error;
        }
    }

    /**
     * Process a status update (delivery/read receipt) into a certified Fact.
     */
    async processStatusObservation(event: NormalizedStatusEvent): Promise<number> {
        // 1. Resolve Fact Type
        const factType: PhysicalFactType = (['sent', 'delivered', 'read', 'failed'].includes(event.status))
            ? 'DELIVERY_SIGNAL_OBSERVED'
            : 'EXTERNAL_STATE_OBSERVED';

        console.log(`[Diag][Adapter] message=${event.messageId} runtime=- decision=respond stage=status_received channel=${event.channel}`);
        // 2. Construct Candidate Signal
        const signal: KernelCandidateSignal = {
            factType,
            source: {
                namespace: event.channel,
                key: event.externalId || `status/${event.messageId}/${event.status}/${event.timestamp.getTime()}`
            },
            subject: event.recipientId ? {
                namespace: `${event.channel}/user`,
                key: event.recipientId
            } : undefined,
            object: {
                namespace: `${event.channel}/message`,
                key: event.messageId
            },
            evidence: {
                raw: event,
                format: 'normalized_status_v1',
                provenance: {
                    driverId: `@fluxcore/${event.channel}`,
                    externalId: event.externalId,
                },
                claimedOccurredAt: event.timestamp
            },
            certifiedBy: {
                adapterId: ADAPTER_ID,
                adapterVersion: ADAPTER_VERSION,
                signature: ''
            }
        };

        signal.certifiedBy.signature = this.signSignal(signal);

        console.log(`[Diag][Adapter->Kernel] message=${event.messageId} runtime=- decision=respond fact=${factType} stage=status_certify`);
        console.log(`[RealityAdapter] 📡 Delegating STATUS ${event.status} for msg ${event.messageId}...`);
        
        // 🔑 DELEGAR A CHATCORE: Para eventos de status, usar certificación directa (no hay mensaje)
        try {
            const sequence = await kernel.ingestSignal(signal);
            console.log(`[RealityAdapter] ✅ Status certified as Sequence #${sequence}`);
            return sequence;
        } catch (error) {
            console.error(`[RealityAdapter] ❌ Failed to certify status:`, error);
            throw error;
        }
    }

    private resolveFactType(message: NormalizedMessage): PhysicalFactType {
        // Simple mapping based on message content type
        switch (message.content.type) {
            case 'text':
            case 'image':
            case 'audio':
            case 'video':
            case 'document':
            case 'location':
            case 'contact':
            case 'template':
                return 'EXTERNAL_INPUT_OBSERVED';
            default:
                return 'EXTERNAL_STATE_OBSERVED';
        }
    }

    private signSignal(signal: KernelCandidateSignal): string {
        const content = this.canonicalize({
            factType: signal.factType,
            source: signal.source,
            subject: signal.subject ?? null,
            object: signal.object ?? null,
            evidence: signal.evidence,
            adapterId: signal.certifiedBy.adapterId,
            adapterVersion: signal.certifiedBy.adapterVersion,
        });

        return crypto
            .createHmac('sha256', SIGNING_SECRET)
            .update(content)
            .digest('hex');
    }

    /**
     * Canonical JSON serialization.
     * MUST match Kernel.canonicalize() exactly to ensure signature verification passes.
     */
    private canonicalize(value: unknown): string {
        if (value === null || typeof value !== 'object') {
            return JSON.stringify(value);
        }

        if (Array.isArray(value)) {
            return '[' + value.map((v) => this.canonicalize(v)).join(',') + ']';
        }

        const entries = Object.entries(value as Record<string, unknown>)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

        return '{' + entries
            .map(([key, val]) => JSON.stringify(key) + ':' + this.canonicalize(val))
            .join(',') + '}';
    }
}

export const realityAdapterService = new RealityAdapterService();

```

---
## 📁 identity-projector.service.ts

```typescript
import { BaseProjector } from '../../core/kernel/base.projector';
import { db, fluxcoreSignals, fluxcoreActors, fluxcoreActorIdentityLinks, fluxcoreAddresses, fluxcoreActorAddressLinks, eq } from '@fluxcore/db';
import { actorResolutionService } from './actor-resolution.service';
import { coreEventBus } from '../../core/events';

const WEBCHAT_ADAPTER_ID = 'chatcore-webchat-gateway';
const CHATCORE_GATEWAY_ID = 'chatcore-gateway';
const WEBSOCKET_SUBJECT_NS = 'chatcore/internal';
const WEBCHAT_SUBJECT_NS = 'chatcore/webchat-visitor';

type TransactionClient = typeof db;

type IdentityEvidence = {
    accountPerspective?: string;
    accountId?: string;
    tenantId?: string;
    visitorToken?: string;
    displayName?: string;
};

interface ParsedIdentityEvidence {
    payload: IdentityEvidence;
}

/**
 * IdentityProjector — RFC-0001 §5.9
 *
 * DETERMINISTIC OFF-KERNEL PROJECTION
 *
 * Reads the Journal and resolves global Actors from physical provenance.
 * Uses only `provenance_driver_id` and `subject` (namespace/key)
 * to identify WHO acted — not business-level accountId.
 *
 * AccountActorContext binding happens in a separate step using
 * provenance_entry_point to determine tenant scope.
 */
export class IdentityProjector extends BaseProjector {
    protected projectorName = 'identity';

    /**
     * Resolves an Actor for the given physical journal entry.
     *
     * The Journal has:
     *   - subject_namespace / subject_key (physical identity hint)
     *   - provenance_driver_id (which channel)
     *   - provenance_entry_point (tenant scope hint for AccountActorContext)
     */
    protected async project(signal: typeof fluxcoreSignals.$inferSelect, tx: TransactionClient): Promise<void> {
        console.log(`[IdentityProjector] ▶️ Processing signal #${signal.sequenceNumber} (${signal.factType})`);
        // ── ChatCore Gateway: authenticated users with @fluxcore/internal namespace ──
        if (signal.certifiedByAdapter === CHATCORE_GATEWAY_ID) {
            if (signal.factType === 'chatcore.message.received') {
                return this.projectAuthenticatedActor(signal, tx);
            }
            return; // Other fact types: not our concern
        }
        
        // ── Webchat widget: provisional identity routing ──
        if (signal.certifiedByAdapter === WEBCHAT_ADAPTER_ID) {
            if (signal.factType === 'EXTERNAL_INPUT_OBSERVED') {
                return this.projectProvisionalActor(signal, tx);
            }
            if (
                signal.factType === 'CONNECTION_EVENT_OBSERVED' &&
                signal.subjectNamespace === WEBCHAT_SUBJECT_NS
            ) {
                return this.projectIdentityLink(signal, tx);
            }
            return; // Other webchat fact types: not our concern
        }

        // ── Standard path: resolve actor for authenticated users ──
        if (!signal.subjectNamespace || !signal.subjectKey) {
            return;
        }

        const driverId = signal.provenanceDriverId;
        const externalId = signal.subjectKey;

        const evidence = this.parseEvidence(signal);
        const accountId = evidence.payload.accountPerspective ?? evidence.payload.accountId ?? null;

        if (!accountId) {
            const resolution = await actorResolutionService.resolveActor({
                accountId: '',
                driverId,
                externalId,
                hints: {
                    displayName: evidence.payload.displayName,
                }
            }, tx);

            console.log(`[IdentityProjector] Seq #${signal.sequenceNumber} -> Actor ${resolution.actorId} (no account context)`);
            return;
        }

        const resolution = await actorResolutionService.resolveFromSnapshot({
            accountId,
            snapshot: {
                driverId,
                externalId,
                displayName: evidence.payload.displayName,
            }
        }, tx);

        console.log(`[IdentityProjector] Seq #${signal.sequenceNumber} -> Actor: ${resolution.actorId}`);

        coreEventBus.emit('identity:resolved', {
            sequenceNumber: signal.sequenceNumber,
            actorId: resolution.actorId,
            contextId: resolution.contextId
        });
    }

    /**
     * B1 — EXTERNAL_INPUT_OBSERVED from chatcore-webchat-gateway.
     * Creates a provisional actor for the visitor_token if one doesn't exist.
     */
    private async projectProvisionalActor(
        signal: typeof fluxcoreSignals.$inferSelect,
        tx: TransactionClient
    ): Promise<void> {
        const evidence = this.parseEvidence(signal);
        const visitorToken: string | undefined = evidence.payload.visitorToken;
        const tenantId: string | undefined = evidence.payload.tenantId;

        if (!visitorToken || !tenantId) {
            console.warn(`[IdentityProjector] B1 Seq #${signal.sequenceNumber} — missing visitorToken or tenantId`);
            return;
        }

        const client = tx;

        // Idempotent: only create if not already present
        const existing = await client.query.fluxcoreActors.findFirst({
            where: eq(fluxcoreActors.externalKey, visitorToken),
        });

        if (existing) {
            console.log(`[IdentityProjector] B1 Seq #${signal.sequenceNumber} — provisional actor already exists (${existing.id})`);
            return;
        }

        const [actor] = await client
            .insert(fluxcoreActors)
            .values({
                type: 'provisional',
                externalKey: visitorToken,
                tenantId,
                createdFromSignal: signal.sequenceNumber,
                internalRef: `webchat:${visitorToken}`,
            })
            .returning();

        // 3. Create Physical Address (entry point)
        const [address] = await client
            .insert(fluxcoreAddresses)
            .values({
                driverId: signal.provenanceDriverId, // 'chatcore/webchat'
                externalId: visitorToken,
            })
            .onConflictDoNothing() // Should not happen if actor didn't exist, but safe
            .returning();
            
        // If address already existed (race condition?), fetch it
        let addressId = address?.id;
        if (!addressId) {
             const existingAddr = await client.query.fluxcoreAddresses.findFirst({
                 where: eq(fluxcoreAddresses.externalId, visitorToken) // assuming driverId matches too or unique enough
             });
             addressId = existingAddr?.id;
        }

        if (addressId) {
             // 4. Link Actor -> Address
             await client.insert(fluxcoreActorAddressLinks).values({
                 actorId: actor.id,
                 addressId: addressId,
                 confidence: 1.0,
                 version: 1
             });
        }

        console.log(`[IdentityProjector] B1 Seq #${signal.sequenceNumber} — provisional actor created: ${actor.id} (visitor: ${visitorToken})`);
    }

    /**
     * B2 — CONNECTION_EVENT_OBSERVED from chatcore-webchat-gateway.
     * Links the provisional actor to a real account.
     */
    private async projectIdentityLink(
        signal: typeof fluxcoreSignals.$inferSelect,
        tx: TransactionClient
    ): Promise<void> {
        const visitorToken = signal.subjectKey; // provisional actor key
        const realAccountId = signal.objectKey; // real account after auth

        if (!visitorToken || !realAccountId) {
            console.warn(`[IdentityProjector] B2 Seq #${signal.sequenceNumber} — missing subjectKey or objectKey`);
            return;
        }

        const evidence = this.parseEvidence(signal);
        const tenantId: string = evidence.payload.tenantId ?? '';
        const client = tx;

        // Find the provisional actor
        const provisionalActor = await client.query.fluxcoreActors.findFirst({
            where: eq(fluxcoreActors.externalKey, visitorToken),
        });

        if (!provisionalActor) {
            console.warn(`[IdentityProjector] B2 Seq #${signal.sequenceNumber} — provisional actor not found for visitor ${visitorToken}`);
            return;
        }

        // Idempotent: insert only if link doesn't exist yet
        await client
            .insert(fluxcoreActorIdentityLinks)
            .values({
                provisionalActorId: provisionalActor.id,
                realAccountId,
                tenantId,
                linkingSignalSeq: signal.sequenceNumber,
            })
            .onConflictDoNothing();

        console.log(`[IdentityProjector] B2 Seq #${signal.sequenceNumber} — identity linked: ${provisionalActor.id} → account ${realAccountId}`);
    }

    /**
     * Handle authenticated users from ChatCore Gateway
     * Creates or links Actor for @fluxcore/internal namespace
     */
    private async projectAuthenticatedActor(signal: typeof fluxcoreSignals.$inferSelect, tx: TransactionClient): Promise<void> {
        // Extract account ID from subject key (should be a valid UUID)
        const accountId = signal.subjectKey;
        
        if (!accountId) {
            console.warn(`[IdentityProjector] CHATCORE Seq #${signal.sequenceNumber} — missing accountId in subjectKey`);
            return;
        }

        const client = tx;

        // Create or find Actor for this account
        let actor = await client.query.fluxcoreActors.findFirst({
            where: eq(fluxcoreActors.displayName, `Account ${accountId.slice(0, 8)}`)
        });

        if (!actor) {
            // Create new actor
            const [newActor] = await client.insert(fluxcoreActors).values({
                actorType: 'account',
                displayName: `Account ${accountId.slice(0, 8)}`,
                metadata: JSON.stringify({ source: 'chatcore-gateway', accountId }),
                isActive: 'true'
            }).returning();
            actor = newActor;
            console.log(`[IdentityProjector] CHATCORE Seq #${signal.sequenceNumber} — created actor ${actor.id} for account ${accountId}`);
        }

        // Create Address for the driver
        const driverId = signal.provenanceDriverId;
        let address = await client.query.fluxcoreAddresses.findFirst({
            where: and(
                eq(fluxcoreAddresses.driverId, driverId),
                eq(fluxcoreAddresses.externalId, accountId)
            )
        });

        if (!address) {
            const [newAddress] = await client.insert(fluxcoreAddresses).values({
                driverId,
                externalId: accountId,
                actorId: actor.id
            }).returning();
            address = newAddress;
            console.log(`[IdentityProjector] CHATCORE Seq #${signal.sequenceNumber} — created address ${address.id} for driver ${driverId}`);
        }

        // Create Actor-Address Link
        let link = await client.query.fluxcoreActorAddressLinks.findFirst({
            where: eq(fluxcoreActorAddressLinks.addressId, address.id)
        });

        if (!link) {
            const [newLink] = await client.insert(fluxcoreActorAddressLinks).values({
                actorId: actor.id,
                addressId: address.id
            }).returning();
            link = newLink;
            console.log(`[IdentityProjector] CHATCORE Seq #${signal.sequenceNumber} — created actor-address link ${link.id}`);
        }

        console.log(`[IdentityProjector] CHATCORE Seq #${signal.sequenceNumber} — ✅ Authenticated actor resolved: actor=${actor.id}, address=${address.id}, link=${link.id}`);
    }

    private parseEvidence(signal: typeof fluxcoreSignals.$inferSelect): ParsedIdentityEvidence {
        let evidenceRoot: unknown = signal.evidenceRaw;

        if (typeof evidenceRoot === 'string') {
            try {
                evidenceRoot = JSON.parse(evidenceRoot);
            } catch (error) {
                console.error(`[IdentityProjector] ❌ Failed to parse evidenceRaw for seq ${signal.sequenceNumber}`, error);
                evidenceRoot = {};
            }
        }

        if (evidenceRoot && typeof evidenceRoot === 'object') {
            return { payload: evidenceRoot as IdentityEvidence };
        }

        return { payload: {} };
    }
}

export const identityProjector = new IdentityProjector();

```

---
## 📁 action-executor.service.ts

```typescript
/**
 * ActionExecutor — FluxCore v8.2
 * 
 * Canon §4.4: Mediated Effect Execution
 * 
 * THE BRIDGE BETWEEN BRAIN AND BODY.
 * 
 * FluxCore (Brain) decides what to do → returns ExecutionAction[]
 * ActionExecutor translates those into ChatCore (Body) operations.
 * 
 * Responsibilities:
 * 1. Receive ExecutionAction[] from the CognitiveDispatcher
 * 2. Validate each action against PolicyContext authorization
 * 3. Call ChatCore services (messageCore, templateService) to execute effects
 * 4. Handle errors per-action (one failure doesn't block others)
 * 5. Emit WebSocket events via ChatCore's event system
 * 
 * Canon Invariant: "If a message goes out, it MUST be in ChatCore's `messages` table."
 */

import { db, messages, conversations, relationships, fluxcoreCognitionQueue, fluxcoreActionAudit } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';
import type { ExecutionAction, ProposeWorkAction, OpenWorkAction, AdvanceWorkStateAction, RequestSlotAction, CloseWorkAction } from '../../core/fluxcore-types';
import type { FluxPolicyContext } from '@fluxcore/db';
import { coreEventBus } from '../../core/events';
import { workEngineService } from '../work-engine.service';
import { messageCore } from '../../core/message-core';

export interface ActionExecutionResult {
    action: ExecutionAction;
    success: boolean;
    messageId?: string;
    error?: string;
}

class ActionExecutorService {

    /**
     * Execute a batch of actions from a runtime invocation.
     * Marks the turn as processed in cognition_queue upon completion.
     */
    async execute(
        actions: ExecutionAction[],
        params: {
            turnId: number;
            conversationId: string;
            accountId: string;
            targetAccountId?: string;
            runtimeId: string;
            policyContext?: FluxPolicyContext;
        }
    ): Promise<ActionExecutionResult[]> {
        const results: ActionExecutionResult[] = [];
        const { turnId, conversationId, accountId, targetAccountId, runtimeId, policyContext } = params;

        for (const action of actions) {
            let status: 'executed' | 'rejected' | 'failed' = 'executed';
            let rejectionReason: string | undefined;

            try {
                // 1. Authorization Check (PRINCIPLE: Sovereignty via PolicyContext)
                if (action.type === 'send_template' && policyContext) {
                    const isAuth = policyContext.authorizedTemplates.includes(action.templateId);
                    if (!isAuth) {
                        status = 'rejected';
                        rejectionReason = `Template ${action.templateId} is not authorized for this account`;
                        throw new Error(rejectionReason);
                    }
                }

                // H8: Tool authorization check
                // if (action.type === 'call_tool' && policyContext) { ... }

                const result = await this.executeOne(action, { conversationId, accountId, targetAccountId });
                results.push(result);

                if (!result.success) {
                    status = 'failed';
                    rejectionReason = result.error;
                }
            } catch (error: any) {
                console.error(`[ActionExecutor] 🔥 Unhandled error executing ${action.type}:`, error.message);
                status = status === 'rejected' ? 'rejected' : 'failed';
                rejectionReason = rejectionReason || error.message;
                results.push({
                    action,
                    success: false,
                    error: error.message,
                });
            } finally {
                // PASO 4: Registrar auditoría
                await db.insert(fluxcoreActionAudit).values({
                    conversationId,
                    accountId,
                    runtimeId,
                    actionType: action.type,
                    actionPayload: action as any,
                    status,
                    rejectionReason,
                }).catch((e) => console.error('[ActionExecutor] Audit failed:', e.message));
            }
        }

        // 2. MARK AS PROCESSED (PRINCIPLE: Mediated Execution closes the loop)
        await this.closeTurn(turnId, accountId);

        const succeeded = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        console.log(`[ActionExecutor] Batch complete for turn ${turnId}: ${succeeded} succeeded, ${failed} failed`);

        return results;
    }

    /**
     * Mark a turn as processed in the cognition queue.
     * Prevents the CognitionWorker from picking it up again.
     */
    async closeTurn(turnId: number, accountId: string): Promise<void> {
        await db.update(fluxcoreCognitionQueue)
            .set({ processedAt: new Date() })
            .where(and(
                eq(fluxcoreCognitionQueue.id, turnId),
                eq(fluxcoreCognitionQueue.accountId, accountId)
            ));

        console.log(`[ActionExecutor] Turn ${turnId} marked as PROCESSED`);
    }

    /**
     * Execute a single action.
     */
    private async executeOne(
        action: ExecutionAction,
        context: { conversationId: string; accountId: string; targetAccountId?: string }
    ): Promise<ActionExecutionResult> {
        switch (action.type) {
            case 'send_message':
                return this.executeSendMessage(action, context);

            case 'send_template':
                return this.executeSendTemplate(action, context);

            case 'start_typing':
                return this.executeStartTyping(action);

            case 'no_action':
                console.log(`[ActionExecutor] 🔇 No action: ${action.reason}`);
                return { action, success: true };

            // ── Fluxi/WES actions (H4) ────────────────────────────────────
            case 'propose_work':
                return this.executeProposeWork(action, context);

            case 'open_work':
                return this.executeOpenWork(action, context);

            case 'advance_work_state':
                return this.executeAdvanceWorkState(action, context);

            case 'request_slot':
                return this.executeRequestSlot(action, context);

            case 'close_work':
                return this.executeCloseWork(action, context);

            default:
                console.warn(`[ActionExecutor] ⚠️ Unknown action type: ${(action as any).type}`);
                return { action, success: false, error: `Unknown action type: ${(action as any).type}` };
        }
    }


    /**
     * Send a message through ChatCore.
     * 
     * Canon: "ChatCore persists the message (generated_by: 'ai'),
     *         sends it to the adapter, and emits the WebSocket event."
     */
    private async executeSendMessage(
        action: { type: 'send_message'; content: string; conversationId: string },
        context: { accountId: string; targetAccountId?: string }
    ): Promise<ActionExecutionResult> {
        try {
            // SEMÁNTICA CORRECTA POST-FIX:
            // context.accountId = quien RESPONDE (Patricia - tiene la IA activa)
            // context.targetAccountId = a quien responder (Harold - recibe la respuesta)
            
            // 1. Persist via ChatCore (Body writes to its own table)
            const [msg] = await db.insert(messages).values({
                conversationId: action.conversationId,
                senderAccountId: context.accountId, // ✅ AI envía DESDE quien responde (Patricia)
                content: { text: action.content },
                type: 'outgoing',
                generatedBy: 'ai',
                status: 'pending',
            }).returning();

            // 2. Update conversation metadata
            await db.update(conversations).set({
                lastMessageAt: new Date(),
                lastMessageText: action.content.substring(0, 200),
                updatedAt: new Date(),
            }).where(eq(conversations.id, action.conversationId));

            // 2. Emit event for WebSocket distribution (ChatCore responsibility)
            coreEventBus.emit('core:message_received', {
                envelope: {
                    conversationId: action.conversationId,
                    senderAccountId: context.accountId,
                    targetAccountId: context.targetAccountId, // 🔑 Usar targetAccountId para el receptor
                    content: { text: action.content },
                    type: 'outgoing',
                    generatedBy: 'ai',
                    meta: {
                        // ✅ META para MessageDispatch
                        targetAccountId: context.targetAccountId, // 🔑 Para quien va el mensaje
                    }
                },
                result: { success: true, messageId: msg.id }
            });

            // 3. Push via WebSocket so the UI receives it in real-time
            await messageCore.broadcastToConversation(action.conversationId, {
                type: 'message:new',
                data: {
                    ...msg,
                    conversationId: action.conversationId,
                    senderAccountId: context.accountId,
                    targetAccountId: context.targetAccountId,
                    content: { text: action.content },
                },
            });

            console.log(`[FluxPipeline] ✅ SENT  conv=${action.conversationId.slice(0, 7)} msgId=${msg.id.slice(0, 7)} by=ai`);

            return {
                action,
                success: true,
                messageId: msg.id,
            };
        } catch (error: any) {
            console.error(`[ActionExecutor] ❌ Failed to send message:`, error.message);
            return { action, success: false, error: error.message };
        }
    }

    /**
     * Send a template through ChatCore.
     * DEUDA: Integrate with templateService for proper rendering.
     */
    private async executeSendTemplate(
        action: { type: 'send_template'; templateId: string; conversationId: string; variables?: Record<string, string> },
        _context: { accountId: string }
    ): Promise<ActionExecutionResult> {
        try {
            // TODO H3: Call templateService.render(templateId, variables) and then send
            console.log(`[ActionExecutor] 📋 Template "${action.templateId}" would be sent to conversation ${action.conversationId}`);

            return {
                action,
                success: true,
            };
        } catch (error: any) {
            return { action, success: false, error: error.message };
        }
    }

    /**
     * Send typing indicator through ChatCore.
     * 
     * Canon: "Typing de la IA: FluxCore decide que va a responder →
     *         Envía acción start_typing a ChatCore →
     *         ChatCore se lo comunica al adaptador externo."
     */
    private async executeStartTyping(
        action: { type: 'start_typing'; conversationId: string }
    ): Promise<ActionExecutionResult> {
        try {
            // Emit via event bus — ChatCore's WebSocket handler picks this up
            // and forwards to the appropriate adapter (Web/WA/Telegram).
            coreEventBus.emit('core:message_received', {
                envelope: {
                    conversationId: action.conversationId,
                    type: 'typing',
                    status: 'typing',
                } as any,
                result: {
                    conversationId: action.conversationId,
                } as any,
            });

            console.log(`[ActionExecutor] ⌨️ Typing indicator sent for conversation ${action.conversationId}`);

            return { action, success: true };
        } catch (error: any) {
            return { action, success: false, error: error.message };
        }
    }
    // ── Fluxi/WES action executors ────────────────────────────────────────────

    /**
     * H4: Persist a ProposedWork and optionally send a confirmation message.
     * Gate evaluation and Work opening happen in subsequent turns.
     */
    private async executeProposeWork(
        action: ProposeWorkAction,
        context: { accountId: string }
    ): Promise<ActionExecutionResult> {
        try {
            const traceId = `propose-${Date.now()}`;
            const proposed = await workEngineService.proposeWork({
                accountId: context.accountId,
                conversationId: action.conversationId,
                traceId,
                workDefinitionId: action.workDefinitionId,
                intent: action.intent,
                candidateSlots: action.candidateSlots,
                confidence: action.confidence,
            });

            console.log(`[ActionExecutor] ✅ ProposedWork created: ${proposed.id}`);

            // Immediately try to open the work (gate evaluation)
            try {
                const work = await workEngineService.openWork(context.accountId, proposed.id);
                console.log(`[ActionExecutor] ✅ Work opened: ${work.id} (state: ${work.state})`);

                if (action.replyMessage) {
                    await this.executeSendMessage(
                        { type: 'send_message', content: action.replyMessage, conversationId: action.conversationId },
                        context
                    );
                }
            } catch (gateError: any) {
                console.warn(`[ActionExecutor] Gate rejected ProposedWork ${proposed.id}:`, gateError.message);
                await workEngineService.discardWork(context.accountId, proposed.id);
            }

            return { action, success: true };
        } catch (error: any) {
            console.error(`[ActionExecutor] ❌ propose_work failed:`, error.message);
            return { action, success: false, error: error.message };
        }
    }

    /**
     * H4: Open a Work from an existing ProposedWork (explicit gate pass).
     */
    private async executeOpenWork(
        action: OpenWorkAction,
        context: { accountId: string }
    ): Promise<ActionExecutionResult> {
        try {
            const work = await workEngineService.openWork(context.accountId, action.proposedWorkId);
            console.log(`[ActionExecutor] ✅ Work opened: ${work.id}`);

            if (action.replyMessage) {
                await this.executeSendMessage(
                    { type: 'send_message', content: action.replyMessage, conversationId: action.conversationId },
                    context
                );
            }

            return { action, success: true };
        } catch (error: any) {
            console.error(`[ActionExecutor] ❌ open_work failed:`, error.message);
            return { action, success: false, error: error.message };
        }
    }

    /**
     * H4: Commit new slot values to an active Work (delta commit).
     */
    private async executeAdvanceWorkState(
        action: AdvanceWorkStateAction,
        context: { accountId: string }
    ): Promise<ActionExecutionResult> {
        try {
            if (action.slots.length > 0) {
                const delta = action.slots.map(s => ({ op: 'set' as const, path: s.path, value: s.value }));
                await workEngineService.commitDelta(action.workId, delta, 'ai', `advance-${Date.now()}`);
                console.log(`[ActionExecutor] ✅ Work ${action.workId} advanced with ${action.slots.length} slots`);
            }

            if (action.replyMessage) {
                await this.executeSendMessage(
                    { type: 'send_message', content: action.replyMessage, conversationId: action.conversationId },
                    context
                );
            }

            return { action, success: true };
        } catch (error: any) {
            console.error(`[ActionExecutor] ❌ advance_work_state failed:`, error.message);
            return { action, success: false, error: error.message };
        }
    }

    /**
     * H4: Request semantic slot confirmation from the user.
     */
    private async executeRequestSlot(
        action: RequestSlotAction,
        context: { accountId: string }
    ): Promise<ActionExecutionResult> {
        try {
            const traceId = `semantic-${Date.now()}`;
            const contextId = await workEngineService.requestSemanticConfirmation(
                action.workId,
                action.slotPath,
                action.proposedValue,
                traceId
            );
            console.log(`[ActionExecutor] ✅ SemanticContext created: ${contextId}`);

            // Send the question to the user
            await this.executeSendMessage(
                { type: 'send_message', content: action.questionMessage, conversationId: action.conversationId },
                context
            );

            return { action, success: true };
        } catch (error: any) {
            console.error(`[ActionExecutor] ❌ request_slot failed:`, error.message);
            return { action, success: false, error: error.message };
        }
    }

    /**
     * H4: Close a Work (complete, cancel, or fail) and send final message.
     */
    private async executeCloseWork(
        action: CloseWorkAction,
        context: { accountId: string }
    ): Promise<ActionExecutionResult> {
        try {
            const terminalState = action.resolution === 'completed' ? 'COMPLETED'
                : action.resolution === 'cancelled' ? 'CANCELLED'
                    : 'FAILED';

            const delta = [{ op: 'transition' as const, toState: terminalState }];
            await workEngineService.commitDelta(action.workId, delta, 'system', `close-${Date.now()}`);
            console.log(`[ActionExecutor] ✅ Work ${action.workId} → ${terminalState}`);

            if (action.replyMessage) {
                await this.executeSendMessage(
                    { type: 'send_message', content: action.replyMessage, conversationId: action.conversationId },
                    context
                );
            }

            return { action, success: true };
        } catch (error: any) {
            console.error(`[ActionExecutor] ❌ close_work failed:`, error.message);
            return { action, success: false, error: error.message };
        }
    }
}

export const actionExecutor = new ActionExecutorService();

```

---
## 📁 cognitive-dispatcher.service.ts

```typescript
/**
 * CognitiveDispatcher — FluxCore v8.3
 *
 * Canon §4.9: The Decision Router
 *
 * Called by the CognitionWorker when a turn is ready to be processed.
 *
 * Responsibilities:
 * 1. Resolve PolicyContext (business governance) for account + relationship
 * 2. Resolve RuntimeConfig (technical config) for the active assistant
 * 3. Build ConversationMessage[] (semantic message history — no raw signals)
 * 4. Check automation mode gate
 * 5. Emit typing keepalive BEFORE calling runtime
 * 6. Delegate to RuntimeGateway
 * 7. Pass actions to ActionExecutor
 *
 * Canon Invariant 10: RuntimeInput must be complete before handleMessage is called.
 */

import { db, conversations, messages, aiSuggestions, fluxcoreCognitionQueue } from '@fluxcore/db';
import type { ConversationMessage } from '@fluxcore/db';
import { eq, desc } from 'drizzle-orm';
import type { RuntimeInput, ExecutionAction } from '../../core/fluxcore-types';
import { fluxPolicyContextService } from '../flux-policy-context.service';
import { runtimeGateway } from './runtime-gateway.service';
import { actionExecutor } from './action-executor.service';
import { accountLabelService } from '../account-label.service';

const MAX_HISTORY_MESSAGES = 50;

export interface DispatchResult {
    actions: ExecutionAction[];
    runtimeUsed: string;
    durationMs: number;
    success: boolean;
    error?: string;
}

class CognitiveDispatcherService {

    /**
     * Dispatch a cognitive turn.
     * Called by CognitionWorker when turn_window_expires_at < NOW().
     */
    async dispatch(params: {
        turnId: number;
        conversationId: string;
        accountId: string;
        lastSignalSeq: number | null;
    }): Promise<DispatchResult> {
        const startTime = Date.now();
        const { turnId, conversationId, accountId } = params;

        console.log(`[CognitiveDispatcher] 🎯 DISPATCH START: turnId=${turnId}, conv=${conversationId.slice(0, 8)}, account=${accountId.slice(0, 8)}`);

        try {
            // 1. Resolve conversation + relationship
            console.log(`[CognitiveDispatcher] Step 1: Resolving conversation...`);
            const [conversation] = await db
                .select()
                .from(conversations)
                .where(eq(conversations.id, conversationId))
                .limit(1);

            if (!conversation) {
                return this.failResult('Conversation not found', startTime);
            }

            // 2. Resolve PolicyContext + RuntimeConfig (Unified in v8.3)
            console.log(`[CognitiveDispatcher] Step 2: Resolving PolicyContext + RuntimeConfig...`);
            const { policyContext, runtimeConfig } = await fluxPolicyContextService.resolveContext(
                accountId,
                conversation.relationshipId || '',
                (conversation as any).channel || 'web'
            );
            policyContext.conversationId = conversationId;
            const accountLabel = await accountLabelService.getLabel(accountId);
            console.log(`[CognitiveDispatcher] ✓ Context resolved: mode=${policyContext.mode}, runtime=${policyContext.activeRuntimeId}`);

            // 3. Automation mode gate (governed by PolicyContext)
            console.log(`[FluxPipeline] 📋 POLICY mode=${policyContext.mode} runtime=${policyContext.activeRuntimeId} account=${accountLabel} (${accountId.slice(0, 7)})`);
            if (policyContext.mode === 'off') {
                console.log(`[FluxPipeline] ⛔ OFF   account=${accountLabel} (${accountId.slice(0, 7)}) → automation disabled`);
                return {
                    actions: [{ type: 'no_action', reason: 'Automation mode is off' }],
                    runtimeUsed: 'none',
                    durationMs: Date.now() - startTime,
                    success: true,
                };
            }
            console.log(`[FluxPipeline] 🤖 ASSIST id=${runtimeConfig.assistantId?.slice(0, 8) ?? 'DEFAULT'} name="${runtimeConfig.assistantName ?? 'fallback'}" model=${runtimeConfig.provider ?? 'groq'}/${runtimeConfig.model ?? 'llama-3.1-8b-instant'} instr=${runtimeConfig.instructions ? Math.round(runtimeConfig.instructions.length / 4) + ' tkn' : 'NONE'} rag=${runtimeConfig.vectorStoreIds?.length ?? 0}`);

            // 5. Fetch + convert conversation history to semantic ConversationMessage[]
            const rawHistory = await db
                .select()
                .from(messages)
                .where(eq(messages.conversationId, conversationId))
                .orderBy(desc(messages.createdAt))
                .limit(MAX_HISTORY_MESSAGES);

            rawHistory.reverse(); // Chronological order

            const conversationHistory: ConversationMessage[] = rawHistory
                .map(msg => {
                    const text = (msg.content as any)?.text as string | undefined;
                    if (!text) return null;
                    // Correct role assignment: only AI-generated messages are 'assistant'
                    const role: 'user' | 'assistant' | 'system' =
                        msg.generatedBy === 'ai' ? 'assistant' : 'user';
                    return { role, content: text, createdAt: msg.createdAt };
                })
                .filter(Boolean) as ConversationMessage[];

            const lastMsg = conversationHistory[conversationHistory.length - 1];
            console.log(`[FluxPipeline] 📜 HISTORY n=${conversationHistory.length} last=${lastMsg?.role ?? 'none'} sender=${lastMsg ? rawHistory[rawHistory.length - 1]?.senderAccountId?.slice(0, 7) : '-'}`);

            // 6. Start typing keepalive (before invoking runtime)
            const typingKeepAlive = this.startTypingKeepAlive(conversationId, accountId);

            try {
                // 7. Build RuntimeInput (Canon §4.5: complete pre-resolved context)
                const input: RuntimeInput = {
                    policyContext,
                    runtimeConfig,
                    conversationHistory,
                };

                const runtimeId = policyContext.activeRuntimeId;

                // 8. Invoke runtime via gateway
                console.log(`[CognitiveDispatcher] Step 8: Invoking runtime '${runtimeId}'...`);
                const actions = await runtimeGateway.invoke(runtimeId, input);
                console.log(`[CognitiveDispatcher] ✓ Runtime returned ${actions.length} actions`);

                typingKeepAlive.stop();

                // 9. Execute actions via ActionExecutor (Canon §4.8: mediated effects)
                console.log(`[CognitiveDispatcher] Step 9: Executing actions (mode=${policyContext.mode})...`);
                if (policyContext.mode === 'auto') {
                    // Resolve targetAccountId from cognition_queue
                    const [queueEntry] = await db
                        .select({ targetAccountId: fluxcoreCognitionQueue.targetAccountId })
                        .from(fluxcoreCognitionQueue)
                        .where(eq(fluxcoreCognitionQueue.id, turnId))
                        .limit(1);
                    
                    await actionExecutor.execute(actions, {
                        turnId,
                        conversationId,
                        accountId,
                        targetAccountId: queueEntry?.targetAccountId,
                        runtimeId,
                        policyContext,
                    });
                    console.log(`[CognitiveDispatcher] ✓ Actions executed in AUTO mode`);
                } else if (policyContext.mode === 'suggest') {
                    const suggestion = actions.find(a => a.type === 'send_message') as any;
                    if (suggestion?.content) {
                        console.log(`[FluxPipeline] 💬 SUGGEST conv=${conversationId.slice(0, 7)} content="${suggestion.content.slice(0, 80)}"`);

                        // Persist suggestion for operator review
                        await db.insert(aiSuggestions).values({
                            conversationId,
                            accountId,
                            content: suggestion.content,
                            model: runtimeConfig.model || 'unknown',
                            provider: runtimeConfig.provider || 'unknown',
                            status: 'pending',
                        });
                    }
                    await actionExecutor.closeTurn(turnId, accountId);
                }

                return {
                    actions,
                    runtimeUsed: runtimeId,
                    durationMs: Date.now() - startTime,
                    success: true,
                };
            } finally {
                typingKeepAlive.stop();
            }

        } catch (error: any) {
            console.error(`[CognitiveDispatcher] ❌ Dispatch failed for conversation ${conversationId}:`, error.message);
            return this.failResult(error.message, startTime);
        }
    }

    private readonly TYPING_PULSE_MS = 3000;

    private startTypingKeepAlive(conversationId: string, accountId: string): { stop: () => void } {
        let stopped = false;
        let timer: ReturnType<typeof setInterval> | null = null;

        const pulse = () => {
            if (stopped) return;
            actionExecutor.execute(
                [{ type: 'start_typing', conversationId }],
                { turnId: 0, conversationId, accountId, runtimeId: 'internal' }
            ).catch(err => {
                console.warn(`[CognitiveDispatcher] Typing pulse error:`, err.message);
            });
        };

        pulse();
        timer = setInterval(pulse, this.TYPING_PULSE_MS);

        return {
            stop: () => {
                if (stopped) return;
                stopped = true;
                if (timer) { clearInterval(timer); timer = null; }
                console.log(`[CognitiveDispatcher] ⌨️ Typing stopped for ${conversationId}`);
            }
        };
    }

    private failResult(error: string, startTime: number): DispatchResult {
        return {
            actions: [{ type: 'no_action', reason: error }],
            runtimeUsed: 'none',
            durationMs: Date.now() - startTime,
            success: false,
            error,
        };
    }
}

export const cognitiveDispatcher = new CognitiveDispatcherService();

```

---
## 📁 chatcore-world-definer.ts

```typescript
/**
 * 🌍 CHATCORE WORLD DEFINER
 * 
 * Componente centralizado y robusto para que ChatCore defina el mundo
 * Reemplaza la lógica dispersa y hardcodeos del kernel
 * 
 * RESPONSABILIDADES:
 * - Definir canales de comunicación
 * - Mapear orígenes a contextos
 * - Centralizar decisiones de routing
 * - Proveer autoridad única
 */

export interface WorldContext {
    channel: 'web' | 'whatsapp' | 'telegram' | 'email' | 'api' | 'internal' | 'test' | 'unknown';
    source: 'human' | 'system' | 'adapter' | 'automated';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    routing: {
        requiresAi: boolean;
        skipProcessing: boolean;
        customHandler?: string;
    };
    metadata: {
        origin: string;
        driverId: string;
        entryPoint: string;
        [key: string]: any;
    };
}

export interface RequestContext {
    headers?: Record<string, string>;
    meta?: Record<string, any>;
    userAgent?: string;
    origin?: string;
    requestId?: string;
    accountId?: string;
    userId?: string;
}

/**
 * 🔑 CHATCORE WORLD DEFINER
 * 
 * Autoridad centralizada para definir el mundo de ChatCore
 */
export class ChatCoreWorldDefiner {
    
    /**
     * 🌍 DEFINIR EL MUNDO DESDE EL CONTEXTO
     * 
     * Método principal y centralizado para definir cómo ChatCore ve el mundo
     */
    static defineWorld(context: RequestContext): WorldContext {
        // 1. Detectar canal (autoridad centralizada)
        const channel = this.resolveChannel(context);
        
        // 2. Detectar origen
        const source = this.resolveSource(context);
        
        // 3. Determinar prioridad
        const priority = this.resolvePriority(context);
        
        // 4. Definir routing
        const routing = this.resolveRouting(channel, source, context);
        
        // 5. Construir metadata
        const metadata = this.buildMetadata(context, channel, source);
        
        return {
            channel,
            source,
            priority,
            routing,
            metadata
        };
    }
    
    /**
     * 🔍 RESOLVER CANAL (LÓGICA CENTRALIZADA)
     */
    private static resolveChannel(context: RequestContext): WorldContext['channel'] {
        const { headers = {}, meta = {}, userAgent, origin } = context;
        
        // 1. Canal explícito (máxima prioridad)
        if (meta.channel) {
            return this.validateChannel(meta.channel);
        }
        
        // 2. Headers específicos
        if (headers['x-channel']) {
            return this.validateChannel(headers['x-channel']);
        }
        
        // 3. User-Agent analysis
        if (userAgent) {
            const uaChannel = this.detectChannelFromUserAgent(userAgent);
            if (uaChannel !== 'unknown') return uaChannel;
        }
        
        // 4. Origin analysis
        if (origin) {
            const originChannel = this.detectChannelFromOrigin(origin);
            if (originChannel !== 'unknown') return originChannel;
        }
        
        // 5. Meta analysis
        if (meta.driverId) {
            const driverChannel = this.detectChannelFromDriverId(meta.driverId);
            if (driverChannel !== 'unknown') return driverChannel;
        }
        
        // 6. Default para requests HTTP
        if (context.requestId || meta.ip) {
            return 'web';
        }
        
        // 7. Unknown si no se puede determinar
        return 'unknown';
    }
    
    /**
     * 🔍 RESOLVER ORIGEN
     */
    private static resolveSource(context: RequestContext): WorldContext['source'] {
        const { meta = {}, userId, accountId } = context;
        
        // 1. Sistema si es interno
        if (meta.driverId?.includes('internal') || meta.systemGenerated) {
            return 'system';
        }
        
        // 2. Adapter si viene de adaptador
        if (meta.driverId?.includes('adapter') || meta.fromAdapter) {
            return 'adapter';
        }
        
        // 3. Automated si es proceso automático
        if (meta.automated || meta.scheduled) {
            return 'automated';
        }
        
        // 4. Human si hay usuario autenticado
        if (userId || accountId) {
            return 'human';
        }
        
        // 5. Default a human
        return 'human';
    }
    
    /**
     * 🔍 RESOLVER PRIORIDAD
     */
    private static resolvePriority(context: RequestContext): WorldContext['priority'] {
        const { meta = {} } = context;
        
        // 1. Prioridad explícita
        if (meta.priority) {
            return this.validatePriority(meta.priority);
        }
        
        // 2. Urgent para casos críticos
        if (meta.urgent || meta.emergency) {
            return 'urgent';
        }
        
        // 3. High para high-value
        if (meta.highPriority || meta.premium) {
            return 'high';
        }
        
        // 4. Low para background
        if (meta.background || meta.lowPriority) {
            return 'low';
        }
        
        // 5. Default normal
        return 'normal';
    }
    
    /**
     * 🔍 RESOLVER ROUTING
     */
    private static resolveRouting(
        channel: WorldContext['channel'], 
        source: WorldContext['source'], 
        context: RequestContext
    ): WorldContext['routing'] {
        const { meta = {} } = context;
        
        // 1. Canales que no requieren AI
        const noAiChannels = ['test', 'internal'];
        const requiresAi = !noAiChannels.includes(channel) && meta.requiresAi !== false;
        
        // 2. Casos que deben saltarse
        const skipProcessing = meta.skipProcessing || channel === 'test';
        
        // 3. Custom handler si se especifica
        const customHandler = meta.customHandler;
        
        return {
            requiresAi,
            skipProcessing,
            customHandler
        };
    }
    
    /**
     * 🔍 CONSTRUIR METADATA
     */
    private static buildMetadata(
        context: RequestContext, 
        channel: WorldContext['channel'], 
        source: WorldContext['source']
    ): WorldContext['metadata'] {
        return {
            origin: context.origin || 'unknown',
            driverId: context.meta?.driverId || 'chatcore/unknown',
            entryPoint: context.meta?.entryPoint || 'api/unknown',
            requestId: context.requestId,
            timestamp: new Date().toISOString(),
            channel,
            source,
            ...context.meta
        };
    }
    
    // === MÉTODOS DE DETECCIÓN ===
    
    private static detectChannelFromUserAgent(userAgent: string): WorldContext['channel'] {
        const ua = userAgent.toLowerCase();
        
        if (ua.includes('whatsapp')) return 'whatsapp';
        if (ua.includes('telegram')) return 'telegram';
        if (ua.includes('email') || ua.includes('mail')) return 'email';
        if (ua.includes('api') || ua.includes('curl') || ua.includes('postman')) return 'api';
        
        return 'unknown';
    }
    
    private static detectChannelFromOrigin(origin: string): WorldContext['channel'] {
        const org = origin.toLowerCase();
        
        if (org.includes('webchat') || org.includes('widget')) return 'web';
        if (org.includes('whatsapp')) return 'whatsapp';
        if (org.includes('telegram')) return 'telegram';
        
        return 'unknown';
    }
    
    private static detectChannelFromDriverId(driverId: string): WorldContext['channel'] {
        const driver = driverId.toLowerCase();
        
        if (driver.includes('whatsapp')) return 'whatsapp';
        if (driver.includes('telegram')) return 'telegram';
        if (driver.includes('email')) return 'email';
        if (driver.includes('api')) return 'api';
        if (driver.includes('internal') || driver.includes('webchat')) return 'web';
        
        return 'unknown';
    }
    
    // === MÉTODOS DE VALIDACIÓN ===
    
    private static validateChannel(channel: string): WorldContext['channel'] {
        const validChannels = ['web', 'whatsapp', 'telegram', 'email', 'api', 'internal', 'test', 'unknown'];
        return validChannels.includes(channel) ? channel as WorldContext['channel'] : 'unknown';
    }
    
    private static validatePriority(priority: string): WorldContext['priority'] {
        const validPriorities = ['low', 'normal', 'high', 'urgent'];
        return validPriorities.includes(priority) ? priority as WorldContext['priority'] : 'normal';
    }
    
    // === MÉTODOS DE UTILIDAD ===
    
    /**
     * 📊 OBTENER ESTADÍSTICAS DE DEFINICIÓN DE MUNDO
     */
    static getWorldDefinitionStats(): any {
        return {
            supportedChannels: ['web', 'whatsapp', 'telegram', 'email', 'api', 'internal', 'test', 'unknown'],
            supportedSources: ['human', 'system', 'adapter', 'automated'],
            supportedPriorities: ['low', 'normal', 'high', 'urgent'],
            version: '1.0.0',
            lastUpdated: new Date().toISOString()
        };
    }
    
    /**
     * 🔍 VALIDAR CONTEXTO COMPLETO
     */
    static validateWorldContext(context: WorldContext): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (!context.channel) errors.push('Channel is required');
        if (!context.source) errors.push('Source is required');
        if (!context.priority) errors.push('Priority is required');
        if (!context.routing) errors.push('Routing is required');
        if (!context.metadata) errors.push('Metadata is required');
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

```

---
## 📁 chatcore-outbox.service.ts

```typescript
import { db, sql } from '@fluxcore/db';
import { chatCoreGateway } from './fluxcore/chatcore-gateway.service';

export interface OutboxMessage {
  messageId: string;
  accountId: string;
  userId: string;
  payload: any;
  meta: {
    ip?: string;
    userAgent?: string;
    clientTimestamp?: string;
    conversationId?: string;
    requestId?: string;
    humanSenderId?: string;
    messageId?: string; // 🔑 Agregar messageId
  };
}

export class ChatCoreOutboxService {
  /**
   * Encola un mensaje para certificación en el Kernel
   * Se ejecuta en la misma transacción que crea el mensaje
   */
  async enqueue(message: OutboxMessage): Promise<void> {
    await db.execute(sql`
      INSERT INTO chatcore_outbox (message_id, status, payload)
      VALUES (${message.messageId}, 'pending', ${JSON.stringify(message)})
    `);
  }

  /**
   * Procesa mensajes pendientes para certificar en el Kernel
   * Usa SKIP LOCKED para evitar procesamiento duplicado
   */
  async processPending(): Promise<void> {
    // Nota: forUpdate() y skipLocked() no están disponibles en Drizzle directamente
    // Usamos una consulta SQL nativa para SKIP LOCKED
    const pending = await db.execute(sql`
      SELECT * FROM chatcore_outbox 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT 10 
      FOR UPDATE SKIP LOCKED
    `);

    for (const item of pending as any[]) {
      try {
        // Marcar como processing para evitar doble procesamiento
        await db.execute(sql`
          UPDATE chatcore_outbox 
          SET status = 'processing' 
          WHERE id = ${item.id}
        `);
        
        // Certificar en el Kernel
        const payload = JSON.parse(item.payload as string);
        const result = await chatCoreGateway.certifyIngress(payload);
        
        // Vincular el mensaje con la señal creada
        if (result.accepted && result.signalId) {
          await db.execute(sql`
            UPDATE messages 
            SET signal_id = ${result.signalId} 
            WHERE id = ${item.message_id}
          `);
        }
        
        // Marcar como enviado
        await db.execute(sql`
          UPDATE chatcore_outbox 
          SET status = 'sent', sent_at = NOW() 
          WHERE id = ${item.id}
        `);
          
        console.log(`[ChatCoreOutbox] ✅ Certified message ${item.message_id}`);
        
      } catch (error) {
        const newAttempts = (item.attempts || 0) + 1;
        const maxRetries = 10;
        
        if (newAttempts >= maxRetries) {
          console.error(`[ChatCoreOutbox] ❌ Max retries exceeded for message ${item.message_id}`);
        }
        
        // Mantener en pending para reintentos
        await db.execute(sql`
          UPDATE chatcore_outbox 
          SET status = 'pending', attempts = ${newAttempts}, last_error = ${error instanceof Error ? error.message : String(error)}
          WHERE id = ${item.id}
        `);
          
        console.error(`[ChatCoreOutbox] ❌ Failed to certify message ${item.message_id}:`, error);
      }
    }
  }

  /**
   * Inicia el worker de procesamiento
   */
  startWorker(): void {
    console.log('[ChatCoreOutbox] 🔄 Starting certification worker...');
    
    setInterval(async () => {
      try {
        await this.processPending();
      } catch (error) {
        console.error('[ChatCoreOutbox] Worker error:', error);
      }
    }, 2000); // Cada 2 segundos
  }

  /**
   * Obtiene estadísticas del outbox
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    sent: number;
    total: number;
  }> {
    const [pending, processing, sent] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM chatcore_outbox WHERE status = 'pending'`),
      db.execute(sql`SELECT COUNT(*) as count FROM chatcore_outbox WHERE status = 'processing'`),
      db.execute(sql`SELECT COUNT(*) as count FROM chatcore_outbox WHERE status = 'sent'`)
    ]);

    return {
      pending: Number(pending[0]?.count || 0),
      processing: Number(processing[0]?.count || 0),
      sent: Number(sent[0]?.count || 0),
      total: Number(pending[0]?.count || 0) + Number(processing[0]?.count || 0) + Number(sent[0]?.count || 0)
    };
  }
}

export const chatCoreOutboxService = new ChatCoreOutboxService();

```

---
## 📁 messages.routes.ts

```typescript
import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import { extensionHost } from '../services/extension-host.service';

import { chatCoreGateway } from '../services/fluxcore/chatcore-gateway.service';
import { conversationService } from '../services/conversation.service';
import { relationshipService } from '../services/relationship.service';

export const messagesRoutes = new Elysia({ prefix: '/messages' })
  .use(authMiddleware)
  .post(
    '/',
    async ({ user, body, set, request }) => {
      const typedBody: any = body as any;
      console.log(`[MessagesRoute] 📥 Incoming POST /messages request from user: ${user?.id}`, {
        hasText: !!typedBody.content?.text,
        mediaCount: typedBody.content?.media?.length || 0
      });

      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        // ═══════════════════════════════════════════════════════════════
        // ARQUITECTURA CORRECTA:
        // ChatCore persiste primero, luego certifica async con outbox
        // FluxCore es reactivo, no controlador del mundo humano
        // ═══════════════════════════════════════════════════════════════
        
        let receiverAccountId = typedBody.senderAccountId; // Fallback para visitor flow
        
        // Resolver RECEPTOR desde la conversación
        const conversation = await conversationService.getConversationById(typedBody.conversationId);
        if (conversation?.relationshipId) {
          const relationship = await relationshipService.getRelationshipById(conversation.relationshipId);
          if (relationship) {
            // El receptor es la OTRA cuenta en la relación
            receiverAccountId = relationship.accountAId === typedBody.senderAccountId
              ? relationship.accountBId
              : relationship.accountAId;
          }
        }
        
        // 1️⃣ CHATCORE PERSISTE PRIMERO (soberanía del mundo conversacional)
        const { messageCore } = await import('../core/message-core');
        const result = await messageCore.receive({
          conversationId: typedBody.conversationId,
          senderAccountId: typedBody.senderAccountId,
          content: typedBody.content,
          type: typedBody.type || 'incoming',
          generatedBy: 'human',
          targetAccountId: receiverAccountId
        });

        // 2️⃣ CERTIFICACIÓN ASÍNCRONA CON OUTBOX (no bloquea respuesta)
        // ✅ Ya no se necesita aquí porque message-core ya encola con el account_id correcto

        // 3️⃣ RETORNAR RESULTADO PERSISTIDO (UI inmediata)
        return { success: true, data: result };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      body: t.Object({
        conversationId: t.String(),
        senderAccountId: t.String(),
        content: t.Object({
          text: t.Optional(t.String()),
          media: t.Optional(t.Array(t.Any())),
          location: t.Optional(t.Any()),
          buttons: t.Optional(t.Array(t.Any())),
        }),
        type: t.Optional(t.Union([t.Literal('incoming'), t.Literal('outgoing'), t.Literal('system')])),
        generatedBy: t.Optional(t.Union([t.Literal('human'), t.Literal('ai')])),
        replyToId: t.Optional(t.String()),
      }),
      detail: { tags: ['Messages'], summary: 'Send message' },
    }
  )
  .get(
    '/:id',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const { messageService } = await import('../services/message.service');
      const message = await messageService.getMessageById(params.id);

      if (!message) {
        set.status = 404;
        return { success: false, message: 'Message not found' };
      }

      return { success: true, data: message };
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Messages'], summary: 'Get message by ID' },
    }
  )
  // V2-3: PATCH - Editar mensaje
  .patch(
    '/:id',
    async ({ user, params, body, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');

        // Verificar que el mensaje existe y pertenece al usuario
        const message = await messageService.getMessageById(params.id);
        if (!message) {
          set.status = 404;
          return { success: false, message: 'Message not found' };
        }

        const existingContent = message.content as any;
        const isFluxCoreBranded = existingContent?.__fluxcore?.branding === true;

        const typedBody: any = body as any;
        let nextContent: any = typedBody.content;
        if (isFluxCoreBranded && typeof nextContent?.text === 'string') {
          nextContent = {
            ...nextContent,
            text: extensionHost.appendFluxCoreBrandingFooter(nextContent.text),
            __fluxcore: existingContent.__fluxcore,
          };
        }

        // Actualizar mensaje
        const updated = await messageService.updateMessage(params.id, {
          content: nextContent,
        });

        return { success: true, data: updated };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        content: t.Object({
          text: t.String(),
        }),
      }),
      detail: { tags: ['Messages'], summary: 'Edit message' },
    }
  )
  // V2-3: DELETE - Eliminar mensaje
  .delete(
    '/:id',
    async ({ user, params, set }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const { messageService } = await import('../services/message.service');

        // Verificar que el mensaje existe
        const message = await messageService.getMessageById(params.id);
        if (!message) {
          set.status = 404;
          return { success: false, message: 'Message not found' };
        }

        // Eliminar mensaje (soft delete o hard delete)
        await messageService.deleteMessage(params.id);

        return { success: true, data: { deleted: true } };
      } catch (error: any) {
        set.status = 400;
        return { success: false, message: error.message };
      }
    },
    {
      isAuthenticated: true,
      params: t.Object({ id: t.String() }),
      detail: { tags: ['Messages'], summary: 'Delete message' },
    }
  );

```

---
## 📁 fluxcore-runtime.routes.ts

```typescript
import { Elysia, t } from 'elysia';
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';
import crypto from 'node:crypto'; // Import crypto
import { fluxcoreService } from '../services/fluxcore.service';
import { retrievalService } from '../services/retrieval.service';
import { ragConfigService } from '../services/rag-config.service';
import { aiTemplateService } from '../services/ai-template.service';
import { PromptBuilder } from '../../../../extensions/fluxcore-asistentes/src/prompt-builder';
import { buildExtraInstructions } from '../../../../extensions/fluxcore-asistentes/src/prompt-utils';

export const fluxcoreRuntimeRoutes = new Elysia({ prefix: '/fluxcore/runtime' })
  .get('/test-trigger', async ({ query, set }) => {
    console.log('--- TEST TRIGGER ---');
    const accountId = query.accountId || 'a9611c11-70f2-46cd-baef-6afcde715f3a';
    const conversationId = query.conversationId || '28a6f187-db8c-4bdb-8405-4db79f0144bf';
    const senderAccountId = query.senderAccountId || '520954df-cd5b-499a-a435-a5c0be4fb4e8';

    // Simular recepción de mensaje
    const envelope = {
      id: crypto.randomUUID(),
      conversationId,
      type: 'incoming' as const, // Fixed type
      content: { text: query.text || 'Hola mundo de prueba fluxcore' },
      senderAccountId,
      targetAccountId: accountId,
      timestamp: new Date()
    };

    // Injectar en coreEventBus (esto lo hace MessageCore normalmente)
    const { coreEventBus } = await import('../core/events');
    coreEventBus.emit('core:message_received', {
      envelope,
      result: { success: true, messageId: envelope.id }
    });

    return { success: true, message: 'Triggered', envelope };
  }, {
    query: t.Object({
      accountId: t.Optional(t.String()),
      text: t.Optional(t.String()),
      conversationId: t.Optional(t.String()),
      senderAccountId: t.Optional(t.String())
    })
  })
  .get('/active-assistant', async ({ query, set }) => {
    const accountId = query.accountId;
    if (!accountId) {
      set.status = 400;
      return 'accountId is required';
    }

    try {
      const composition = await fluxcoreService.resolveActiveAssistant(accountId);
      if (!composition) {
        set.status = 500;
        return 'Could not resolve active assistant';
      }
      return composition;
    } catch (err: any) {
      console.error('Error resolving active assistant:', err);
      set.status = 500;
      return 'Internal Server Error';
    }
  }, {
    query: t.Object({
      accountId: t.String()
    })
  })
  .get('/composition/:assistantId', async ({ params, set }) => {
    try {
      const composition = await fluxcoreService.getAssistantComposition(params.assistantId);
      if (!composition) {
        set.status = 404;
        return 'Assistant not found';
      }
      return composition;
    } catch (err: any) {
      console.error('Error fetching assistant composition:', err);
      set.status = 500;
      return 'Internal Server Error';
    }
  }, {
    params: t.Object({
      assistantId: t.String()
    })
  })
  .get('/prompt-preview/:assistantId', async ({ params, query, set }) => {
    try {
      const composition = await fluxcoreService.getAssistantComposition(params.assistantId);
      if (!composition) {
        set.status = 404;
        return { success: false, message: 'Assistant not found' };
      }

      const assistant = composition.assistant;
      if (query.accountId && assistant.accountId !== query.accountId) {
        set.status = 403;
        return { success: false, message: 'Assistant does not belong to specified account' };
      }
      const hasKnowledgeBase = Array.isArray(composition.vectorStores) && composition.vectorStores.length > 0;
      const extraInstructions = buildExtraInstructions({
        instructions: composition.instructions,
        includeSearchKnowledge: hasKnowledgeBase,
      });

      const modelConfig = assistant.modelConfig ?? {};
      const promptBuilder = new PromptBuilder({
        mode: 'suggest',
        maxTokens: typeof (modelConfig as any)?.maxTokens === 'number' ? (modelConfig as any).maxTokens : 256,
        temperature: typeof modelConfig.temperature === 'number' ? modelConfig.temperature : 0.7,
        model: typeof modelConfig.model === 'string' ? modelConfig.model : 'llama-3.1-8b-instant',
      });

      const context = {
        assistantMeta: {
          assistantId: assistant.id,
          assistantName: assistant.name,
          instructionIds: composition.instructions?.map((inst: any) => inst.id) || [],
          vectorStoreIds: composition.vectorStores?.map((vs: any) => vs.id) || [],
          vectorStores: composition.vectorStores?.map((vs: any) => ({ id: vs.id, name: vs.name })) || [],
          tools: composition.tools?.map((tool: any) => ({ id: tool.id, name: tool.name })) || [],
          modelConfig: assistant.modelConfig,
        },
      } as any;

      const built = promptBuilder.build(context, assistant.accountId, extraInstructions);

      return {
        success: true,
        data: {
          systemPrompt: built.systemPrompt,
          config: built.config,
          assistant: {
            id: assistant.id,
            name: assistant.name,
            modelConfig: assistant.modelConfig,
          },
          instructionsCount: extraInstructions.length,
          hasKnowledgeBase,
        },
      };
    } catch (err: any) {
      console.error('Error building prompt preview:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    params: t.Object({
      assistantId: t.String(),
    }),
    query: t.Optional(t.Object({
      accountId: t.Optional(t.String()),
    })),
  })
  // RAG-008: Endpoint para obtener contexto RAG de vector stores
  .post('/rag-context', async ({ body, set }) => {
    const { accountId, query, vectorStoreIds, options } = body;

    if (!accountId || !query) {
      set.status = 400;
      return { success: false, message: 'accountId and query are required' };
    }

    try {
      // Si no se especifican vectorStoreIds, intentar obtener del asistente activo
      let vsIds = vectorStoreIds;
      if (!vsIds || vsIds.length === 0) {
        const composition = await fluxcoreService.resolveActiveAssistant(accountId);
        if (composition?.vectorStores) {
          vsIds = composition.vectorStores.map((vs: any) => vs.id);
        }
      }

      if (!vsIds || vsIds.length === 0) {
        return {
          success: true,
          data: {
            context: '',
            sources: [],
            totalTokens: 0,
            chunksUsed: 0,
          }
        };
      }

      const ragContext = await retrievalService.buildContext(
        query,
        vsIds,
        accountId,
        options
      );

      return {
        success: true,
        data: ragContext,
      };
    } catch (err: any) {
      console.error('Error building RAG context:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    body: t.Object({
      accountId: t.String(),
      query: t.String(),
      vectorStoreIds: t.Optional(t.Array(t.String())),
      options: t.Optional(t.Object({
        topK: t.Optional(t.Number()),
        minScore: t.Optional(t.Number()),
        maxTokens: t.Optional(t.Number()),
      })),
    })
  })
  .post('/tools/list-templates', async ({ body, set }) => {
    const { accountId } = body;
    if (!accountId) {
      set.status = 400;
      return { success: false, message: 'accountId is required' };
    }

    try {
      const templates = await aiTemplateService.getAvailableTemplates(accountId);
      const simplified = templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        variables: t.variables?.map((v: any) => v.name) || [],
        instructions: t.aiUsageInstructions || null,
      }));
      return { success: true, data: simplified };
    } catch (err: any) {
      console.error('Error listing templates:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    body: t.Object({
      accountId: t.String(),
    })
  })
  .post('/tools/send-template', async ({ body, set }) => {
    const { accountId, conversationId, templateId, variables } = body;
    if (!accountId || !conversationId || !templateId) {
      set.status = 400;
      return { success: false, message: 'accountId, conversationId and templateId are required' };
    }

    try {
      const result = await aiTemplateService.sendAuthorizedTemplate({
        accountId,
        conversationId,
        templateId,
        variables,
      });

      return {
        success: true,
        data: {
          messageId: (result as any)?.messageId ?? null,
          status: (result as any)?.status ?? 'sent',
        },
      };
    } catch (err: any) {
      console.error('Error sending template:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    body: t.Object({
      accountId: t.String(),
      conversationId: t.String(),
      templateId: t.String(),
      variables: t.Optional(t.Record(t.String(), t.String())),
    })
  })
  // Diagnostic snapshot: returns full vector store state from DB (not UI cache)
  .get('/vector-store-snapshot/:id', async ({ params, query, set }) => {
    const accountId = query.accountId;
    if (!accountId) {
      set.status = 400;
      return { success: false, message: 'accountId is required' };
    }

    try {
      const store = await fluxcoreService.getVectorStoreById(params.id, accountId);
      if (!store) {
        set.status = 404;
        return { success: false, message: 'Vector store not found' };
      }

      const files = await fluxcoreService.getVectorStoreFiles(params.id);

      const ragConfig = await ragConfigService.getEffectiveConfig(params.id, accountId);

      // Chunk stats from DB
      const chunkStats = await db.execute(sql`
        SELECT
          count(*)::int as total_chunks,
          count(embedding)::int as chunks_with_embedding,
          coalesce(sum(token_count), 0)::int as total_tokens
        FROM fluxcore_document_chunks
        WHERE vector_store_id = ${params.id}::uuid
      `);
      const stats = Array.isArray(chunkStats) && chunkStats.length > 0
        ? chunkStats[0]
        : { total_chunks: 0, chunks_with_embedding: 0, total_tokens: 0 };

      // Compute real file counts and size from files table
      const realFileCount = files.length;
      const realSizeBytes = files.reduce((sum: number, f: any) => sum + (f.sizeBytes || 0), 0);
      const completedCount = files.filter((f: any) => f.status === 'completed').length;
      const failedCount = files.filter((f: any) => f.status === 'failed').length;
      const processingCount = files.filter((f: any) => f.status === 'processing').length;

      return {
        success: true,
        data: {
          vectorStore: {
            ...store,
            _computed: {
              realFileCount,
              realSizeBytes,
              realFileCounts: {
                total: realFileCount,
                completed: completedCount,
                failed: failedCount,
                in_progress: processingCount,
              },
            },
          },
          files: files.map((f: any) => ({
            id: f.id,
            name: f.name,
            status: f.status,
            sizeBytes: f.sizeBytes,
            mimeType: f.mimeType,
            errorMessage: f.errorMessage,
          })),
          ragConfig,
          chunkStats: stats,
        },
      };
    } catch (err: any) {
      console.error('Error building vector store snapshot:', err);
      set.status = 500;
      return { success: false, message: err.message || 'Internal Server Error' };
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
    query: t.Object({
      accountId: t.String(),
    }),
  });

```

---
## 📁 fluxcore-projector-errors.ts

❌ **ARCHIVO NO ENCONTRADO**

---
## 🔍 GUÍA DE ANÁLISIS DINÁMICO

### 📋 **BÚSQUEDAS CLAVE (Ctrl+F):**

#### **🚨 SOBERANÍA:**
- **"ingestSignal"** → Todos los call sites
- **"kernel.ingestSignal"** → Llamadas directas al Kernel
- **"messageService.createMessage"** → Persistencia de mensajes
- **"certifyIngress"** → Flujo de certificación

#### **🌍 WORLD DEFINER:**
- **"ChatCoreWorldDefiner"** → Implementación centralizada
- **"defineWorld"** → Lógica de definición del mundo
- **"resolveChannel"** → Detección de canales
- **"WorldContext"** → Tipo de contexto completo

#### **🔄 PROJECTORS:**
- **"projectMessage"** → Procesamiento de mensajes
- **"worldContext"** → Uso de metadata del Gateway
- **"routing"** → Decisiones de routing
- **"skipProcessing"** → Casos especiales

#### **📊 FLUJO COMPLETO:**
- **"messageCore.receive"** → Recepción de mensajes
- **"chatcoreOutboxService"** → Procesamiento asíncrono
- **"signal.evidenceRaw"** → Evidencia cruda
- **"signalId"** → Vinculación mensaje-señal

### 🎯 **ANÁLISIS DE ESTADO ACTUAL:**

#### **✅ **SI ENCUENTRAS:**
- **"messageService.createMessage" ANTES de "kernel.ingestSignal"** → Soberanía preservada
- **"ChatCoreWorldDefiner.defineWorld"** → Autoridad centralizada
- **"worldContext?.channel"** → Uso de metadata completa

#### **❌ **SI ENCUENTRAS:**
- **"kernel.ingestSignal" ANTES de persistencia** → Soberanía comprometida
- **"channel = 'web'" hardcodeado** → Hardcodeos pendientes
- **Múltiples "ingestSignal" sin control** → Call sites dispersos

---

## 🎯 **ESTE SNAPSHOT SIEMPRE ESTÁ ACTUALIZADO**

### 📋 **POR QUÉ ES DINÁMICO:**
- **Sin interpretaciones estáticas** que quedan obsoletas
- **Código fuente real** que refleja el estado actual
- **Búsquedas en tiempo real** para análisis preciso
- **Referencia viva** que evoluciona con el código

### 🔄 **CUÁNDO ACTUALIZAR:**
- **Después de cambios críticos** en el flujo
- **Antes de continuar** con siguiente fase
- **Para documentación** del estado actual
- **Para análisis** de regresión

---

*Snapshot dinámico actualizado: 2026-03-01T14:21:16.442Z*
*Tipo: 🌍 DINÁMICO - SIN INTERPRETACIONES HARCODEADAS*
*Análisis: Se hace al leer, no al escribir*
*Próxima actualización: Cuando sea necesario*
