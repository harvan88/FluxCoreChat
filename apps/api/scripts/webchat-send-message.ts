#!/usr/bin/env bun
import crypto from 'node:crypto';
import { chatCoreWebchatGateway } from '../src/services/fluxcore/chatcore-webchat-gateway.service';

const tenantId = process.env.WEBCHAT_TENANT_ID || '3e94f74e-e6a0-4794-bd66-16081ee3b02d';
const visitorToken = process.env.WEBCHAT_VISITOR_TOKEN || crypto.randomUUID();
const text = process.env.WEBCHAT_MESSAGE || 'Hola desde widget (B1)';

async function main() {
  console.log('📨 Enviando mensaje webchat (B1)...');
  console.log(' tenantId:', tenantId);
  console.log(' visitorToken:', visitorToken);
  console.log(' text:', text);

  const result = await chatCoreWebchatGateway.certifyIngress({
    visitorToken,
    tenantId,
    payload: { text },
    meta: {
      conversationId: process.env.WEBCHAT_CONVERSATION_ID,
      clientTimestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
  });

  if (!result.accepted) {
    console.error('❌ Gateway rechazó el mensaje:', result.reason);
    process.exit(1);
  }

  console.log('✅ Señal almacenada. sequenceNumber =', result.signalId);
  console.log('\nUsa WEBCHAT_VISITOR_TOKEN=<token> para hacer seguimiento o enlazar.');
}

main().catch((err) => {
  console.error('❌ Error enviando mensaje webchat:', err);
  process.exit(1);
});
