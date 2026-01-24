
import { Elysia, t } from 'elysia';
import { messageCore } from '../core/message-core';

export const testRoutes = new Elysia({ prefix: '/test' })
    .post(
        '/inject',
        async ({ body, set }) => {
            // Solo permitir en desarrollo
            if (process.env.NODE_ENV === 'production') {
                set.status = 403;
                return 'Forbidden in production';
            }

            console.log('🧪 Injecting Test Message via HTTP...');

            try {
                const result = await messageCore.send({
                    conversationId: body.conversationId,
                    senderAccountId: body.senderAccountId,
                    content: { text: body.text },
                    type: 'incoming', // Simular entrada
                    generatedBy: 'human',
                });

                if (!result.success) {
                    set.status = 400;
                    return { error: result.error };
                }

                return { success: true, messageId: result.messageId };
            } catch (e: any) {
                console.error('Injection failed:', e);
                set.status = 500;
                return { error: e.message };
            }
        },
        {
            body: t.Object({
                conversationId: t.String(),
                senderAccountId: t.String(),
                text: t.String(),
            })
        }
    );
