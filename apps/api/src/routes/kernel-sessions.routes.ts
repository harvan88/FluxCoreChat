import { Elysia, t } from 'elysia';

export const kernelSessionsRoutes = new Elysia({ prefix: '/kernel/sessions' }).get(
    '/active',
    async ({ query }) => {
        // Simulación simple - devuelve datos de prueba
        const mockSessions = [
            {
                sessionId: '11111111-2222-3333-4444-555555555555',
                actorId: 'actor-demo',
                accountId: '4c3a23e2-3c48-4ed6-afbf-21c47e59bc00',
                status: 'active',
                deviceHash: 'device-xyz',
                method: 'magic_link',
                entryPoint: 'demo-ui',
                scopes: ['read:kernel'],
                updatedAt: '2026-02-16T22:30:45.168Z',
            }
        ];

        return { success: true, data: { sessions: mockSessions } };
    },
    {
        query: t.Object({
            accountId: t.Optional(t.String()),
            actorId: t.Optional(t.String()),
            status: t.Optional(t.String()),
        }),
    },
);
