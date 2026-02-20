/**
 * Adapters Routes - API para gestión de adaptadores de canales
 */

import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getAdapterManager,
  type NormalizedMessage,
  type NormalizedStatusEvent
} from '../../../../packages/adapters/src';

// Inicializar adapter manager con configuración de entorno
const adapterManager = getAdapterManager({
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'fluxcore_verify',
    enabled: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
  },
});

// Inicializar adapters
adapterManager.initialize().catch(() => {
  console.log('[adapters] Initialization skipped (no credentials configured)');
});


import { realityAdapterService } from '../services/fluxcore/reality-adapter.service';

// Handler para mensajes entrantes
adapterManager.onMessage(async (message: NormalizedMessage, channel: string) => {
  console.log(`[adapters] Received ${channel} message from ${message.from.phone}. Certifying...`);

  try {
    // RFC-0001: Ingest into Sovereign Kernel
    await realityAdapterService.processExternalObservation(message);
  } catch (error) {
    console.error(`[adapters] 💥 Kernel Certification Failed:`, error);
  }
});

export const adaptersRoutes = new Elysia({ prefix: '/adapters' })
  // GET /adapters/status - Estado de todos los adaptadores (público)
  .get('/status', async () => {
    const status = adapterManager.getStatus();
    const channels = adapterManager.getAvailableChannels();

    return {
      success: true,
      data: {
        channels,
        adapters: status,
        configured: {
          whatsapp: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
          telegram: false,
          instagram: false,
        },
      },
    };
  })

  // GET /adapters/whatsapp/webhook - Verificación de webhook (Meta)
  .get('/whatsapp/webhook', async ({ query, set }) => {
    const mode = query['hub.mode'] as string;
    const token = query['hub.verify_token'] as string;
    const challenge = query['hub.challenge'] as string;

    if (mode === 'subscribe') {
      const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'fluxcore_verify';

      if (token === expectedToken) {
        console.log('[whatsapp-webhook] Verification successful');
        return challenge;
      }
    }

    set.status = 403;
    return 'Forbidden';
  })

  // POST /adapters/whatsapp/webhook - Recibir mensajes de WhatsApp
  .post('/whatsapp/webhook', async ({ body }) => {
    try {
      // 1. Intentar procesar como mensaje normal
      const message = await adapterManager.handleWebhook('whatsapp', body);

      if (message) {
        console.log(`[whatsapp-webhook] Message received: ${message.id}`);
      } else {
        // 2. Si no es mensaje, revisar si es un status update (RFC-0001 Delivery Signal)
        const payload = body as any;
        const statusUpdate = payload.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]; // WhatsApp suele mandar batches, aquí tomamos el primero por simplicidad MVP

        if (statusUpdate) {
          const statusEvent: NormalizedStatusEvent = {
            channel: 'whatsapp',
            messageId: statusUpdate.id,
            externalId: statusUpdate.id + '_' + statusUpdate.status, // Composite ID
            status: statusUpdate.status,
            timestamp: new Date(parseInt(statusUpdate.timestamp) * 1000),
            recipientId: statusUpdate.recipient_id,
            raw: statusUpdate
          };

          await realityAdapterService.processStatusObservation(statusEvent);
        }
      }

      // WhatsApp espera un 200 OK
      return 'OK';
    } catch (error: any) {
      console.error('[whatsapp-webhook] Error:', error.message);
      return 'OK';
    }
  })

  // Rutas autenticadas
  .use(authMiddleware)

  // POST /adapters/:channel/send - Enviar mensaje (autenticado)
  .post('/:channel/send', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    try {
      const { to, content, replyTo } = body as any;

      if (!to || !content) {
        set.status = 400;
        return { success: false, message: 'to and content are required' };
      }

      const result = await adapterManager.send(params.channel, {
        to,
        content,
        replyTo,
      });

      if (!result.success) {
        set.status = 400;
        return { success: false, message: result.error };
      }

      return {
        success: true,
        data: {
          messageId: result.messageId,
          externalId: result.externalId,
          timestamp: result.timestamp,
        },
      };
    } catch (error: any) {
      set.status = 500;
      return { success: false, message: error.message };
    }
  }, {
    params: t.Object({
      channel: t.String(),
    }),
    body: t.Object({
      to: t.String(),
      content: t.Object({
        type: t.String(),
        text: t.Optional(t.String()),
        media: t.Optional(t.Object({
          url: t.String(),
          mimeType: t.Optional(t.String()),
          filename: t.Optional(t.String()),
          caption: t.Optional(t.String()),
        })),
      }),
      replyTo: t.Optional(t.String()),
    }),
  })

  // GET /adapters/:channel/status - Estado de un adaptador específico
  .get('/:channel/status', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    const adapter = adapterManager.getAdapter(params.channel);

    if (!adapter) {
      set.status = 404;
      return { success: false, message: `Adapter not found: ${params.channel}` };
    }

    return {
      success: true,
      data: adapter.getStatus(),
    };
  }, {
    params: t.Object({
      channel: t.String(),
    }),
  });

export default adaptersRoutes;
