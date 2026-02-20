/**
 * WebSocket Handler usando Bun nativo
 * 
 * Este módulo implementa WebSocket sin depender de @elysiajs/websocket
 * ya que ese plugin no tiene versión compatible con Elysia 0.8.x
 */

import { messageCore } from '../core/message-core';
import { automationController } from '../services/automation-controller.service';
import { extensionHost } from '../services/extension-host.service';
import { smartDelayService } from '../services/smart-delay.service';
import { chatCoreGateway } from '../services/fluxcore/chatcore-gateway.service';
import { chatCoreWebchatGateway } from '../services/fluxcore/chatcore-webchat-gateway.service';

interface WSMessage {
  type:
  | 'subscribe'
  | 'unsubscribe'
  | 'message'
  | 'ping'
  | 'request_suggestion'
  | 'approve_suggestion'
  | 'discard_suggestion'
  | 'user_activity'
  | 'widget:connect'
  | 'widget:message';
  relationshipId?: string;
  conversationId?: string;
  content?: any;
  senderAccountId?: string;
  accountId?: string;
  suggestionId?: string;
  suggestedText?: string;
  messageId?: string;
  createdAt?: string;
  activity?: 'typing' | 'recording' | 'idle' | 'cancel';
  // Widget specific
  alias?: string;
  visitorId?: string;   // legacy
  visitorToken?: string; // RFC-0001 provisional identity
}

// Store de conexiones activas por relationshipId
const subscriptions = new Map<string, Set<any>>();

// Conexiones WS activas (para broadcast de eventos del sistema)
const activeConnections = new Set<any>();

export function broadcastAll(payload: any): void {
  const message = JSON.stringify(payload);
  for (const ws of activeConnections) {
    try {
      ws.send(message);
    } catch {
      activeConnections.delete(ws);
    }
  }
}

export function handleWSMessage(ws: any, message: string | Buffer): void {
  try {
    const data = JSON.parse(message.toString()) as WSMessage;

    switch (data.type) {
      case 'subscribe':
        if (data.relationshipId) {
          // Agregar a subscripciones
          if (!subscriptions.has(data.relationshipId)) {
            subscriptions.set(data.relationshipId, new Set());
          }
          subscriptions.get(data.relationshipId)!.add(ws);

          // Registrar en MessageCore también
          messageCore.subscribe(data.relationshipId, (payload) => {
            broadcastToRelationship(data.relationshipId!, payload);
          });

          ws.send(JSON.stringify({
            type: 'subscribed',
            relationshipId: data.relationshipId
          }));
        }
        break;

      case 'unsubscribe':
        if (data.relationshipId) {
          const subs = subscriptions.get(data.relationshipId);
          if (subs) {
            subs.delete(ws);
            if (subs.size === 0) {
              subscriptions.delete(data.relationshipId);
              messageCore.unsubscribe(data.relationshipId);
            }
          }
          ws.send(JSON.stringify({
            type: 'unsubscribed',
            relationshipId: data.relationshipId
          }));
        }
        break;

      case 'message':
        if (data.conversationId && data.content && data.senderAccountId) {
          // 🛡️ CHATCORE GATEWAY: Certify Ingress (Reality Adapter)
          // Validamos que sea un intento de comunicación humana
          const wsData = ws.data || {};
          
          chatCoreGateway.certifyIngress({
            accountId: data.senderAccountId, // Business Context
            userId: data.senderAccountId,    // Authenticated Actor
            payload: data.content,
            meta: {
              ip: wsData.ip,
              userAgent: wsData.userAgent,
              clientTimestamp: data.createdAt || new Date().toISOString(),
              conversationId: data.conversationId,
              requestId: wsData.requestId
            }
          }).then((certification) => {
            if (!certification.accepted) {
              console.warn(`[WS] 🛑 Gateway rejected ingress: ${certification.reason}`);
              ws.send(JSON.stringify({
                type: 'error',
                message: `Gateway rejected: ${certification.reason}`
              }));
              return;
            }

            // Si el Kernel acepta (o ya existe), procedemos
            messageCore.send({
              conversationId: data.conversationId!,
              senderAccountId: data.senderAccountId!,
              content: data.content!,
              type: 'outgoing',
              generatedBy: 'human',
            }).then((result) => {
              if (result.success) {
                ws.send(JSON.stringify({
                  type: 'message:sent',
                  messageId: result.messageId
                }));
              } else {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: result.error
                }));
              }
            });
          });
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;

      case 'request_suggestion':
        // Solicitar sugerencia de IA para un mensaje
        if (data.conversationId && data.accountId) {
          handleSuggestionRequest(ws, data);
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'conversationId and accountId required for suggestion'
          }));
        }
        break;

      case 'approve_suggestion':
        // Aprobar y enviar sugerencia como mensaje
        if (data.conversationId && data.senderAccountId && data.suggestedText) {
          const decision = extensionHost.getSuggestionBrandingDecision(data.suggestionId);
          const finalText = decision.promo
            ? extensionHost.appendFluxCoreBrandingFooter(data.suggestedText)
            : data.suggestedText;

          const content: any = decision.promo
            ? { text: finalText, __fluxcore: { branding: true } }
            : { text: finalText };

          messageCore.send({
            conversationId: data.conversationId,
            senderAccountId: data.senderAccountId,
            content,
            type: 'outgoing',
            generatedBy: 'ai',
          }).then((result) => {
            if (result.success) {
              ws.send(JSON.stringify({
                type: 'suggestion:approved',
                messageId: result.messageId,
                suggestionId: data.suggestionId,
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                message: result.error
              }));
            }
          });
        }
        break;

      case 'discard_suggestion':
        // Descartar sugerencia (solo notificar)
        ws.send(JSON.stringify({
          type: 'suggestion:discarded',
          suggestionId: data.suggestionId
        }));
        break;

      case 'user_activity':
        if (data.accountId && data.conversationId && data.activity) {
          // Existente: Lógica SmartDelay
          const result = smartDelayService.touchActivity({
            accountId: data.accountId,
            conversationId: data.conversationId,
            activity: data.activity,
          });

          // Nuevo: Broadcast universal de actividad
          messageCore.broadcastActivity(data.conversationId, {
            accountId: data.accountId,
            activity: data.activity
          });

          if (result.result === 'cancelled' && result.suggestionId) {
            ws.send(JSON.stringify({
              type: 'suggestion:auto_cancelled',
              suggestionId: result.suggestionId,
            }));
          }
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'accountId, conversationId and activity required for user activity events',
          }));
        }
        break;

      case 'widget:connect':
        // Widget público: establecer conexión
        if (data.alias && (data.visitorToken || data.visitorId)) {
          handleWidgetConnect(ws, data);
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'alias and visitorToken required for widget connection'
          }));
        }
        break;

      case 'widget:message':
        // Widget público: enviar mensaje
        if (data.alias && (data.visitorToken || data.visitorId) && data.content) {
          handleWidgetMessage(ws, data);
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'alias, visitorToken and content required for widget message'
          }));
        }
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  } catch (error: any) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}

export function handleWSOpen(ws: any): void {
  try {
    console.log('[ws-handler] WebSocket connection opened');
    console.log('[ws-handler] Active connections before add:', activeConnections.size);
    activeConnections.add(ws);
    console.log('[ws-handler] Active connections after add:', activeConnections.size);
    
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString()
    }));
    console.log('[ws-handler] Sent connected message to client');
  } catch (error) {
    console.error('[ws-handler] CRITICAL ERROR in handleWSOpen:', error);
    // Try to notify client of error if possible
    try {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Internal Server Error during connection establishment'
      }));
    } catch (e) {
      // Ignore send error
    }
  }
}

export function handleWSClose(ws: any): void {
  console.log('WebSocket connection closed');
  activeConnections.delete(ws);
  // Limpiar subscripciones de este ws
  for (const [relationshipId, subs] of subscriptions.entries()) {
    if (subs.has(ws)) {
      subs.delete(ws);
      if (subs.size === 0) {
        subscriptions.delete(relationshipId);
        messageCore.unsubscribe(relationshipId);
      }
    }
  }
}

export function broadcastToRelationship(relationshipId: string, payload: any): void {
  const subs = subscriptions.get(relationshipId);
  if (subs) {
    const message = JSON.stringify(payload);
    for (const ws of subs) {
      try {
        ws.send(message);
      } catch (e) {
        // Connection might be closed
        subs.delete(ws);
      }
    }
  }
}

/**
 * 🔧 REFACTORIZADO: Manejar solicitud de sugerencia de IA
 * Delay se aplica ANTES de generar sugerencia, usa timingConfig del asistente activo
 */
async function handleSuggestionRequest(ws: any, data: WSMessage): Promise<void> {
  const { conversationId, accountId, relationshipId } = data;
  const traceId = `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    console.log(`[ws-handler][${traceId}] request_suggestion received`, {
      conversationId,
      accountId,
      relationshipId,
      messageId: data.messageId,
      hasContent: !!data.content,
    });

    // Verificar modo de automatización
    const evaluation = await automationController.evaluateTrigger({
      accountId: accountId!,
      relationshipId,
      messageType: 'incoming',
    });

    console.log(`[ws-handler][${traceId}] automation evaluation`, {
      shouldProcess: evaluation.shouldProcess,
      reason: evaluation.reason,
      mode: evaluation.mode,
    });

    if (!evaluation.shouldProcess) {
      ws.send(JSON.stringify({
        type: 'suggestion:disabled',
        reason: evaluation.reason,
        mode: evaluation.mode,
      }));
      return;
    }

    // 🔧 NUEVO: Obtener asistente activo para usar su timingConfig
    const { fluxcoreService } = await import('../services/fluxcore.service');
    const composition = await fluxcoreService.resolveActiveAssistant(accountId!);

    console.log(`[ws-handler][${traceId}] active assistant`, {
      id: composition?.assistant?.id,
      name: composition?.assistant?.name,
      runtime: composition?.assistant?.runtime,
      externalId: composition?.assistant?.externalId,
      timingConfig: composition?.assistant?.timingConfig,
      modelConfig: composition?.assistant?.modelConfig,
    });

    // Extraer timingConfig del asistente activo (o usar defaults)
    const delaySeconds = composition?.assistant?.timingConfig?.responseDelaySeconds ?? 2;
    const smartDelayEnabled = composition?.assistant?.timingConfig?.smartDelay ?? false;

    // Función auxiliar para generar sugerencia
    const generateSuggestion = async () => {
      // Notificar que estamos generando
      ws.send(JSON.stringify({
        type: 'suggestion:generating',
        conversationId,
      }));

      const lastMessage = data.content?.text || 'Mensaje del usuario';
      const result = await extensionHost.generateAIResponse(
        conversationId!,
        accountId!,
        lastMessage,
        {
          mode: evaluation.mode === 'automatic' ? 'auto' : 'suggest',
          triggerMessageId: typeof data?.messageId === 'string' ? data.messageId : undefined,
          triggerMessageCreatedAt: data?.createdAt ? new Date(data.createdAt as any) : undefined,
          traceId,
        }
      );

      if (!result.ok) {
        ws.send(JSON.stringify({
          type: 'suggestion:unavailable',
          reason: result.block.message,
          conversationId,
        }));
        return null;
      }

      const aiSuggestion = result.suggestion;
      if (!aiSuggestion) {
        ws.send(JSON.stringify({
          type: 'suggestion:unavailable',
          reason: 'AI service not configured.',
          conversationId,
        }));
        return null;
      }

      const stripped = extensionHost.stripFluxCorePromoMarker(aiSuggestion.content);
      return {
        id: aiSuggestion.id,
        conversationId,
        extensionId: '@fluxcore/asistentes',
        suggestedText: stripped.text,
        confidence: 0.9,
        reasoning: `Generado por ${aiSuggestion.model} (${aiSuggestion.usage?.totalTokens ?? 0} tokens)`,
        alternatives: [],
        createdAt: aiSuggestion.generatedAt?.toISOString() ?? new Date().toISOString(),
        mode: evaluation.mode,
      };
    };

    // 🔧 NUEVO: Aplicar delay ANTES de generar (en modo automático)
    if (evaluation.mode === 'automatic') {
      if (smartDelayEnabled) {
        // Smart delay: Monitorea actividad del usuario
        smartDelayService.scheduleResponse({
          conversationId: conversationId!,
          accountId: accountId!,
          suggestionId: 'pending', // Se actualizará después
          lastMessageText: data.content?.text || '',
          onTypingStart: () => {
            ws.send(JSON.stringify({
              type: 'suggestion:auto_typing',
            }));
          },
          onProcess: async () => {
            const suggestion = await generateSuggestion();
            if (suggestion) {
              await processSuggestion(ws, {
                conversationId: conversationId!,
                accountId: accountId!,
                suggestion,
                lastMessageText: data.content?.text || '',
              });
            }
          },
        });
      } else {
        // Fixed delay: Esperar antes de generar
        const delayMs = delaySeconds * 1000;

        ws.send(JSON.stringify({
          type: 'suggestion:auto_waiting',
          delayMs,
        }));

        setTimeout(async () => {
          try {
            ws.send(JSON.stringify({
              type: 'suggestion:auto_typing',
            }));

            // 🔧 CRÍTICO: Generar sugerencia DESPUÉS del delay
            const suggestion = await generateSuggestion();

            if (suggestion) {
              setTimeout(async () => {
                await processSuggestion(ws, {
                  conversationId: conversationId!,
                  accountId: accountId!,
                  suggestion,
                  lastMessageText: data.content?.text || '',
                });
              }, 2000); // Typing animation delay
            }
          } catch (error) {
            console.error('[ws-handler] Error in fixed delay auto-send:', error);
          }
        }, delayMs);
      }
    } else {
      // Modo sugerencia: Generar inmediatamente sin delay
      const suggestion = await generateSuggestion();
      if (suggestion) {
        ws.send(JSON.stringify({
          type: 'suggestion:ready',
          data: suggestion,
        }));
      }
    }

  } catch (error: any) {
    ws.send(JSON.stringify({
      type: 'error',
      message: `Failed to generate suggestion: ${error.message}`,
    }));
  }
}

/**
 * WEBCHAT GATEWAY: Manejar conexión de widget público
 * Si se incluye accountId (visitante autenticado) → certifica B2 (identity link)
 */
async function handleWidgetConnect(ws: any, data: WSMessage): Promise<void> {
  const { alias, visitorToken, visitorId, accountId } = data;
  const token = visitorToken || visitorId!;

  try {
    // Buscar cuenta (tenantId) por alias
    const { db, accounts } = await import('@fluxcore/db');
    const { eq, or } = await import('drizzle-orm');

    const [account] = await db
      .select()
      .from(accounts)
      .where(or(eq(accounts.alias, alias!), eq(accounts.username, alias!)))
      .limit(1);

    if (!account) {
      ws.send(JSON.stringify({
        type: 'widget:error',
        message: `Account not found for alias: ${alias}`,
      }));
      return;
    }

    const wsData = ws.data || {};

    // B2 — Si el visitante ya está autenticado, certificar el vínculo de identidad
    if (accountId) {
      const b2 = await chatCoreWebchatGateway.certifyConnectionEvent({
        visitorToken: token,
        realAccountId: accountId,
        tenantId: account.id,
        meta: {
          ip: wsData.ip,
          userAgent: wsData.userAgent,
          requestId: wsData.requestId,
        },
      });

      if (!b2.accepted) {
        console.warn(`[Widget] B2 certification failed for visitor ${token}: ${b2.reason}`);
      } else {
        console.log(`[Widget] B2 identity link certified: visitor ${token} → account ${accountId} (signal #${b2.signalId})`);
      }
    }

    ws.send(JSON.stringify({
      type: 'widget:connected',
      accountId: account.id,
      accountName: account.displayName,
      tenantId: account.id,
      visitorToken: token,
    }));

    console.log(`[Widget] Visitor ${token} connected to ${alias}${accountId ? ` (authenticated as ${accountId})` : ''}`);

  } catch (error: any) {
    ws.send(JSON.stringify({
      type: 'widget:error',
      message: error.message,
    }));
  }
}

/**
 * Procesar la sugerencia de IA
 */
async function processSuggestion(ws: any, params: {
  conversationId: string;
  accountId: string;
  suggestion: any;
  lastMessageText: string;
}): Promise<void> {
  try {
    // Notificar que está enviando
    ws.send(JSON.stringify({
      type: 'suggestion:auto_sending',
      suggestionId: params.suggestion.id,
    }));

    // Send the message
    const decision = extensionHost.getSuggestionBrandingDecision(params.suggestion.id);
    const finalText = decision.promo
      ? extensionHost.appendFluxCoreBrandingFooter(params.suggestion.suggestedText)
      : params.suggestion.suggestedText;

    await messageCore.send({
      conversationId: params.conversationId,
      senderAccountId: params.accountId,
      content: { text: finalText } as any,
      type: 'outgoing',
      generatedBy: 'ai',
    });

    console.log(`[ActivityWatcher] Mensaje enviado exitosamente para ${params.accountId}:${params.conversationId}`);
  } catch (error) {
    console.error('[ActivityWatcher] Error procesando sugerencia:', error);
  }
}

/**
 * WEBCHAT GATEWAY: Manejar mensaje de widget público
 * Certifica ingreso vía chatcore-webchat-gateway (RFC-0001 B1)
 */
async function handleWidgetMessage(ws: any, data: WSMessage): Promise<void> {
  const { alias, visitorToken, visitorId, content } = data;
  const token = visitorToken || visitorId!; // backwards compat

  try {
    // Buscar cuenta (tenantId) por alias
    const { db, accounts } = await import('@fluxcore/db');
    const { eq, or } = await import('drizzle-orm');

    const [account] = await db
      .select()
      .from(accounts)
      .where(or(eq(accounts.alias, alias!), eq(accounts.username, alias!)))
      .limit(1);

    if (!account) {
      ws.send(JSON.stringify({
        type: 'widget:error',
        message: `Account not found for alias: ${alias}`,
      }));
      return;
    }

    const wsData = ws.data || {};

    // Certificar ingreso vía webchat gateway (B1 — provisional identity)
    const certification = await chatCoreWebchatGateway.certifyIngress({
      visitorToken: token,
      tenantId: account.id,
      payload: content,
      meta: {
        ip: wsData.ip,
        userAgent: wsData.userAgent,
        clientTimestamp: new Date().toISOString(),
        conversationId: data.conversationId,
        requestId: wsData.requestId,
      },
    });

    if (!certification.accepted) {
      ws.send(JSON.stringify({
        type: 'widget:error',
        message: `Gateway rejected: ${certification.reason}`,
      }));
      return;
    }

    ws.send(JSON.stringify({
      type: 'widget:message_received',
      messageId: `widget_${Date.now()}`,
      signalId: certification.signalId,
      timestamp: new Date().toISOString(),
    }));

  } catch (error: any) {
    ws.send(JSON.stringify({
      type: 'widget:error',
      message: error.message,
    }));
  }
}

// Exportar para uso en servidor híbrido
export const wsConfig = {
  message: handleWSMessage,
  open: handleWSOpen,
  close: handleWSClose,
};
