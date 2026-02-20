#!/usr/bin/env bun
import crypto from 'node:crypto';
import { chatCoreWebchatGateway } from '../src/services/fluxcore/chatcore-webchat-gateway.service';

const tenantId = process.env.WEBCHAT_TENANT_ID || '3e94f74e-e6a0-4794-bd66-16081ee3b02d';
const visitorTokenEnv = process.env.WEBCHAT_VISITOR_TOKEN;
const realAccountId = process.env.WEBCHAT_ACCOUNT_ID || tenantId;

if (!visitorTokenEnv) {
  console.error('❌ Falta WEBCHAT_VISITOR_TOKEN (token del visitante a enlazar)');
  process.exit(1);
}

const visitorToken = visitorTokenEnv;

async function main() {
  console.log('🔗 Enviando CONNECTION_EVENT (B2)...');
  console.log(' tenantId:', tenantId);
  console.log(' visitorToken:', visitorToken);
  console.log(' realAccountId:', realAccountId);

  const result = await chatCoreWebchatGateway.certifyConnectionEvent({
    visitorToken,
    realAccountId,
    tenantId,
    meta: {
      requestId: crypto.randomUUID(),
    },
  });

  if (!result.accepted) {
    console.error('❌ Gateway rechazó el evento:', result.reason);
    process.exit(1);
  }

  console.log('✅ Evento de conexión almacenado. sequenceNumber =', result.signalId);
}

main().catch((err) => {
  console.error('❌ Error enviando CONNECTION_EVENT:', err);
  process.exit(1);
});
