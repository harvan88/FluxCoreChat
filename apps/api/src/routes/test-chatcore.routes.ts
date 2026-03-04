import { Elysia } from 'elysia';
import { messageCore } from '../core/message-core';

/**
 * Rutas de prueba simples para validar el flujo ChatCore → Kernel
 * TEMPORALES - Eliminar en producción
 */
export const testChatCoreRoutes = new Elysia({ prefix: '/test-chatcore' })
  
  // POST /test-chatcore/simulate-whatsapp
  .post('/simulate-whatsapp', async ({ body }: any) => {
    const whatsappMessage = {
      from: { id: '5491155556789', phone: '5491155556789' },
      to: { id: '123456789' },
      content: { text: body?.message || 'Hola, quiero información' },
      externalId: `wamid.test.${Date.now()}`,
      channel: 'whatsapp',
      timestamp: new Date().toISOString()
    };

    try {
      const result = await messageCore.receiveFromAdapter(whatsappMessage, 'whatsapp');
      
      return {
        success: true,
        messageId: result.messageId,
        externalId: whatsappMessage.externalId,
        channel: 'whatsapp'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  })

  // POST /test-chatcore/simulate-webchat
  .post('/simulate-webchat', async ({ body }: any) => {
    const webchatMessage = {
      from: { id: `visitor_${Date.now()}` },
      to: { id: 'business-account' },
      content: { text: body?.message || 'Hola desde el widget' },
      externalId: `webchat.test.${Date.now()}`,
      channel: 'web',
      timestamp: new Date().toISOString()
    };

    try {
      const result = await messageCore.receiveFromAdapter(webchatMessage, 'web');
      
      return {
        success: true,
        messageId: result.messageId,
        externalId: webchatMessage.externalId,
        channel: 'web'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
