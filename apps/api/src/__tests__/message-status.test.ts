/**
 * COR-002: Test de status en messages
 * Verifica que el campo status funciona correctamente
 */

import { describe, it, expect, beforeAll } from 'bun:test';

const API_URL = 'http://localhost:3000';

// Variables para tests
let authToken: string;
let account1Id: string;
let account2Id: string;
let conversationId: string;

describe('COR-002: Message Status', () => {
  beforeAll(async () => {
    // 1. Crear usuario de prueba
    const timestamp = Date.now();
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-cor002-${timestamp}@test.com`,
        password: 'TestPassword123!',
        username: `testcor2${timestamp}`,
      }),
    });
    const registerData: any = await registerRes.json();
    authToken = registerData.token;

    // 2. Crear cuenta 1
    const acc1Res = await fetch(`${API_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        username: `sender${timestamp}`,
        displayName: 'Test Sender',
        type: 'personal',
      }),
    });
    const acc1Data: any = await acc1Res.json();
    account1Id = acc1Data.id;

    // 3. Crear cuenta 2
    const acc2Res = await fetch(`${API_URL}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        username: `receiver${timestamp}`,
        displayName: 'Test Receiver',
        type: 'business',
      }),
    });
    const acc2Data: any = await acc2Res.json();
    account2Id = acc2Data.id;

    // 4. Crear relación
    const relRes = await fetch(`${API_URL}/relationships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        accountAId: account1Id,
        accountBId: account2Id,
      }),
    });
    const relData: any = await relRes.json();

    // 5. Crear conversación
    const convRes = await fetch(`${API_URL}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        relationshipId: relData.id,
        channel: 'web',
      }),
    });
    const convData: any = await convRes.json();
    conversationId = convData.id;
  });

  it('should create message with default status "synced"', async () => {
    const msgRes = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        conversationId,
        senderAccountId: account1Id,
        content: {
          text: 'Mensaje de prueba COR-002',
          type: 'text',
        },
        type: 'outgoing',
      }),
    });

    expect(msgRes.status).toBe(201);
    const msgData: any = await msgRes.json();
    expect(msgData.id).toBeTruthy();
    
    // Verificar que el mensaje tiene status por defecto
    // El status por defecto es 'synced'
    const getRes = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    expect(getRes.ok).toBe(true);
    const messages: any = await getRes.json();
    expect(messages.length).toBeGreaterThan(0);
    
    // Buscar el mensaje creado
    const createdMsg = messages.find((m: any) => m.id === msgData.id);
    expect(createdMsg).toBeTruthy();
    expect(createdMsg.status).toBe('synced');
  });

  it('should return messages with status field', async () => {
    const getRes = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(getRes.ok).toBe(true);
    const messages: any = await getRes.json();
    
    // Todos los mensajes deben tener el campo status
    for (const msg of messages) {
      expect(msg).toHaveProperty('status');
      expect(['local_only', 'pending_backend', 'synced', 'sent', 'delivered', 'seen']).toContain(msg.status);
    }
  });

  it('should verify database column exists', async () => {
    // Este test verifica indirectamente que la migración se ejecutó
    // Si el mensaje se creó con status, la columna existe
    const msgRes = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        conversationId,
        senderAccountId: account1Id,
        content: {
          text: 'Segundo mensaje COR-002',
          type: 'text',
        },
        type: 'outgoing',
      }),
    });

    expect(msgRes.status).toBe(201);
  });
});

describe('COR-002: Health Check', () => {
  it('should verify API is healthy', async () => {
    const healthRes = await fetch(`${API_URL}/health`);
    expect(healthRes.ok).toBe(true);

    const health: any = await healthRes.json();
    expect(health.status).toBe('ok');
  });
});
