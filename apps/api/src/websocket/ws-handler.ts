/**
 * WebSocket Handler usando Bun nativo
 * 
 * Este módulo implementa WebSocket sin depender de @elysiajs/websocket
 * ya que ese plugin no tiene versión compatible con Elysia 0.8.x
 */

import { messageCore } from '../core/message-core';
import { automationController } from '../services/automation-controller.service';
import { aiService } from '../services/ai.service';

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'message' | 'ping' | 'request_suggestion' | 'approve_suggestion' | 'discard_suggestion' | 'widget:connect' | 'widget:message';
  relationshipId?: string;
  conversationId?: string;
  content?: any;
  senderAccountId?: string;
  accountId?: string;
  suggestionId?: string;
  suggestedText?: string;
  // Widget specific
  alias?: string;
  visitorId?: string;
}

// Store de conexiones activas por relationshipId
const subscriptions = new Map<string, Set<any>>();

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
            broadcast(data.relationshipId!, payload);
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
          messageCore.send({
            conversationId: data.conversationId,
            senderAccountId: data.senderAccountId,
            content: data.content,
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
          const decision = aiService.getSuggestionBrandingDecision(data.suggestionId);
          const finalText = decision.promo
            ? aiService.appendCoreIABrandingFooter(data.suggestedText)
            : data.suggestedText;

          const content: any = decision.promo
            ? { text: finalText, __coreIa: { branding: true } }
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

      case 'widget:connect':
        // Widget público: establecer conexión
        if (data.alias && data.visitorId) {
          handleWidgetConnect(ws, data);
        } else {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'alias and visitorId required for widget connection' 
          }));
        }
        break;

      case 'widget:message':
        // Widget público: enviar mensaje
        if (data.alias && data.visitorId && data.content) {
          handleWidgetMessage(ws, data);
        } else {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'alias, visitorId and content required for widget message' 
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
  console.log('WebSocket connection opened');
  ws.send(JSON.stringify({ 
    type: 'connected', 
    timestamp: new Date().toISOString() 
  }));
}

export function handleWSClose(ws: any): void {
  console.log('WebSocket connection closed');
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

function broadcast(relationshipId: string, payload: any): void {
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
 * HITO-WEBSOCKET-SUGGESTIONS: Manejar solicitud de sugerencia de IA
 */
async function handleSuggestionRequest(ws: any, data: WSMessage): Promise<void> {
  const { conversationId, accountId, relationshipId } = data;
  
  try {
    // Verificar modo de automatización
    const evaluation = await automationController.evaluateTrigger({
      accountId: accountId!,
      relationshipId,
      messageType: 'incoming',
    });

    if (!evaluation.shouldProcess) {
      ws.send(JSON.stringify({
        type: 'suggestion:disabled',
        reason: evaluation.reason,
        mode: evaluation.mode,
      }));
      return;
    }

    // Notificar que estamos generando
    ws.send(JSON.stringify({
      type: 'suggestion:generating',
      conversationId,
    }));

    // V2-2: Generar sugerencia con AI service real
    let suggestion;
    
    // Usar AI service real con Groq
    const lastMessage = data.content?.text || 'Mensaje del usuario';
    const aiSuggestion = await aiService.generateResponse(
      conversationId!,
      accountId!,
      lastMessage,
      {
        mode: 'suggest',
        triggerMessageId: typeof data?.messageId === 'string' ? data.messageId : undefined,
        triggerMessageCreatedAt: data?.createdAt ? new Date(data.createdAt as any) : undefined,
      }
    );

    if (aiSuggestion) {
      const stripped = aiService.stripCoreIAPromoMarker(aiSuggestion.content);
      suggestion = {
        id: aiSuggestion.id,
        conversationId,
        extensionId: 'core-ai',
        suggestedText: stripped.text,
        confidence: 0.9,
        reasoning: `Generado por ${aiSuggestion.model} (${aiSuggestion.usage.totalTokens} tokens)`,
        alternatives: [],
        createdAt: aiSuggestion.generatedAt.toISOString(),
        mode: evaluation.mode,
      };
    }

    // Si no hay sugerencia (API no configurada), notificar al cliente
    if (!suggestion) {
      ws.send(JSON.stringify({
        type: 'suggestion:unavailable',
        reason: 'AI service not configured. Set GROQ_API_KEY environment variable or configure @fluxcore/core-ai installation.',
        conversationId,
      }));
      return;
    }

    // Enviar sugerencia
    ws.send(JSON.stringify({
      type: 'suggestion:ready',
      data: suggestion,
    }));

    // Si modo es automatic, enviar automáticamente después de delay
    if (evaluation.mode === 'automatic') {
      const config = evaluation.rule?.config as any;
      const delayMs = config?.delayMs || 2000;
      
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'suggestion:auto_sending',
          suggestionId: suggestion.id,
          delayMs,
        }));
      }, delayMs);
    }

  } catch (error: any) {
    ws.send(JSON.stringify({
      type: 'error',
      message: `Failed to generate suggestion: ${error.message}`,
    }));
  }
}

/**
 * KAREN WIDGET: Manejar conexión de widget público
 */
async function handleWidgetConnect(ws: any, data: WSMessage): Promise<void> {
  const { alias, visitorId } = data;
  
  try {
    // Buscar cuenta por alias
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

    // Por ahora, solo confirmar conexión
    // En una implementación completa, crearíamos o buscaríamos una relationship
    ws.send(JSON.stringify({
      type: 'widget:connected',
      accountId: account.id,
      accountName: account.displayName,
      visitorId,
    }));

    console.log(`[Widget] Visitor ${visitorId} connected to ${alias}`);
    
  } catch (error: any) {
    ws.send(JSON.stringify({
      type: 'widget:error',
      message: error.message,
    }));
  }
}

/**
 * KAREN WIDGET: Manejar mensaje de widget público
 */
async function handleWidgetMessage(ws: any, data: WSMessage): Promise<void> {
  const { alias, visitorId, content } = data;
  
  try {
    // Buscar cuenta por alias
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

    // Log del mensaje (en implementación completa, persistiríamos y notificaríamos)
    console.log(`[Widget] Message from ${visitorId} to ${alias}: ${content?.text}`);

    // Confirmar recepción
    ws.send(JSON.stringify({
      type: 'widget:message_received',
      messageId: `widget_${Date.now()}`,
      timestamp: new Date().toISOString(),
    }));

    // TODO: En implementación completa:
    // 1. Crear o buscar relationship anónima
    // 2. Persistir mensaje en conversación
    // 3. Notificar al owner de la cuenta
    // 4. Generar respuesta de IA si está configurado
    
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
