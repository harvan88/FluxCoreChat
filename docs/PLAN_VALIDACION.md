# PLAN DE VALIDACIÓN - FluxCore

> **Fecha:** 2025-12-06  
> **Derivado de:** INFORME_AUDITORIA.md, BACKLOG_CORRECTIVO.md  
> **Objetivo:** Verificar que las correcciones implementadas cumplen con el TOTEM

---

## Tests de Regresión a Implementar

### Suite 1: MessageCore + ExtensionHost Integration

| # | Test | Funcionalidad | Criterio de Éxito |
|---|------|---------------|-------------------|
| T-001 | `messageCore.receive()` calls ExtensionHost | Integración MessageCore | ExtensionHost.processMessage() se ejecuta para mensajes incoming |
| T-002 | Extensions receive message context | Contexto de extensiones | Extensión recibe accountId, relationshipId, conversationId |
| T-003 | Multiple extensions process same message | Multi-extensión | Todas las extensiones habilitadas procesan el mensaje |
| T-004 | Extension failure doesn't break MessageCore | Resiliencia | Error en extensión no impide persistencia del mensaje |
| T-005 | core-ai generates suggestion on incoming message | IA automática | Mensaje incoming genera sugerencia si mode='suggest' |

```typescript
// test-messagecore-integration.ts
describe('MessageCore + ExtensionHost Integration', () => {
  it('should call extensionHost.processMessage for incoming messages', async () => {
    const spy = jest.spyOn(extensionHost, 'processMessage');
    
    await messageCore.receive({
      conversationId: testConversationId,
      senderAccountId: testAccountA,
      content: { text: 'Hello' },
      type: 'incoming',
    });
    
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      accountId: expect.any(String),
      message: expect.objectContaining({ type: 'incoming' }),
    }));
  });
});
```

---

### Suite 2: Actor Model

| # | Test | Funcionalidad | Criterio de Éxito |
|---|------|---------------|-------------------|
| T-010 | Create actor for user | Creación de actores | Actor type='user' se crea correctamente |
| T-011 | Create actor for account | Creación de actores | Actor type='account' se crea correctamente |
| T-012 | Create actor for extension | Creación de actores | Actor type='extension' con extensionId |
| T-013 | Message has from_actor_id | Trazabilidad | Mensaje guarda actor origen |
| T-014 | Message has to_actor_id | Trazabilidad | Mensaje guarda actor destino |
| T-015 | Get message with actor info | Consulta | GET message incluye from_actor y to_actor |

```typescript
// test-actor-model.ts
describe('Actor Model', () => {
  it('should create message with from_actor_id and to_actor_id', async () => {
    const message = await messageService.createMessage({
      conversationId: testConversationId,
      senderAccountId: testAccountA,
      content: { text: 'Test' },
      type: 'outgoing',
    });
    
    expect(message.fromActorId).toBeDefined();
    expect(message.toActorId).toBeDefined();
  });
});
```

---

### Suite 3: Message Status Canónicos

| # | Test | Funcionalidad | Criterio de Éxito |
|---|------|---------------|-------------------|
| T-020 | Message created with status='synced' | Estado inicial | Backend crea mensajes con status synced |
| T-021 | Update message status to 'delivered' | Actualización | Status se puede actualizar |
| T-022 | Update message status to 'seen' | Actualización | Status seen es válido |
| T-023 | Invalid status rejected | Validación | Status inválido lanza error |

---

### Suite 4: Panel Stack Manager (Frontend)

| # | Test | Funcionalidad | Criterio de Éxito |
|---|------|---------------|-------------------|
| T-030 | Open new container | Apertura | Container se crea y muestra |
| T-031 | Open tab in existing container | Tabs | Tab se añade al container |
| T-032 | Maximum 3 containers enforced | Límite | Cuarto container muestra diálogo |
| T-033 | Pin container | Fijado | Container pinned no se cierra automáticamente |
| T-034 | Move tab between containers | Drag & drop | Tab se mueve correctamente |
| T-035 | Close container closes all tabs | Cierre | Todas las tabs se cierran |
| T-036 | Pinned container survives close all | Protección | Container pinned permanece |
| T-037 | Layout persists after refresh | Persistencia | Layout se recupera de IndexedDB |
| T-038 | Duplicate container | Duplicación | Nueva instancia independiente |

```typescript
// test-panel-stack.ts
describe('Panel Stack Manager', () => {
  it('should enforce maximum of 3 containers', () => {
    const store = useLayoutStore.getState();
    
    store.openContainer('chat');
    store.openContainer('contacts');
    store.openContainer('settings');
    
    expect(store.containers.size).toBe(3);
    
    // Cuarto container debería mostrar diálogo o fallar
    expect(() => store.openContainer('extensions')).toThrow();
  });
  
  it('should persist layout to IndexedDB', async () => {
    const store = useLayoutStore.getState();
    store.openContainer('chat');
    store.openTab('chat-1', { conversationId: '123' });
    
    store.saveLayout();
    
    // Simular refresh
    store.containers.clear();
    await store.loadLayout();
    
    expect(store.containers.size).toBe(1);
  });
});
```

---

### Suite 5: Offline-First (IndexedDB)

| # | Test | Funcionalidad | Criterio de Éxito |
|---|------|---------------|-------------------|
| T-040 | Message saved to IndexedDB | Persistencia local | Mensaje existe en IndexedDB |
| T-041 | Message has syncState='local_only' | Estado sync | Nuevo mensaje es local_only |
| T-042 | Sync changes state to 'synced' | Sincronización | Después de sync exitoso |
| T-043 | Offline message queued | Cola offline | Mensaje sin conexión se encola |
| T-044 | Reconnection triggers sync | Reconexión | Mensajes encolados se sincronizan |
| T-045 | Conflict resolved with backend wins | Conflictos | Backend prevalece |
| T-046 | Optimistic update shows immediately | UI | Mensaje aparece antes de sync |

```typescript
// test-offline-first.ts
describe('Offline-First', () => {
  it('should queue messages when offline', async () => {
    // Simular offline
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    
    await sendMessage({ text: 'Offline message' });
    
    const queue = await syncQueue.getPending();
    expect(queue.length).toBe(1);
    expect(queue[0].operation).toBe('create');
  });
  
  it('should sync when reconnecting', async () => {
    // Simular reconexión
    window.dispatchEvent(new Event('online'));
    
    await waitFor(() => {
      expect(syncQueue.getPending()).resolves.toHaveLength(0);
    });
  });
});
```

---

### Suite 6: Context Limits Validation

| # | Test | Funcionalidad | Criterio de Éxito |
|---|------|---------------|-------------------|
| T-050 | private_context accepts 5000 chars | Límite válido | 5000 chars se guarda |
| T-051 | private_context rejects 5001 chars | Límite excedido | Error de validación |
| T-052 | relationship context accepts 2000 chars | Límite válido | 2000 chars se guarda |
| T-053 | relationship context rejects 2001 chars | Límite excedido | Error de validación |

---

### Suite 7: UI de Extensiones

| # | Test | Funcionalidad | Criterio de Éxito |
|---|------|---------------|-------------------|
| T-060 | ExtensionsPanel renders available extensions | Lista | Se muestran extensiones disponibles |
| T-061 | Install extension from UI | Instalación | Extensión se instala correctamente |
| T-062 | ExtensionConfigPanel saves config | Configuración | Config se guarda en backend |
| T-063 | AISuggestionCard shows suggestion | Sugerencia | Card aparece con contenido |
| T-064 | Approve suggestion sends message | Aprobación | Mensaje se envía |
| T-065 | Reject suggestion removes card | Rechazo | Card desaparece |
| T-066 | Edit suggestion modifies content | Edición | Contenido modificado se envía |

---

## Métricas de Aceptación

### Performance

| Métrica | Valor Objetivo | Cómo Medir |
|---------|----------------|------------|
| Tiempo de carga inicial | < 3s | Lighthouse |
| Tiempo de sincronización | < 500ms por mensaje | Console timing |
| Latencia de WebSocket | < 100ms | Network panel |
| IndexedDB write | < 50ms | Performance API |
| Render de nuevo container | < 16ms (60fps) | React DevTools |

### Funcionalidad

| Métrica | Valor Objetivo |
|---------|----------------|
| Tests pasando | 100% |
| Cobertura de código backend | > 70% |
| Cobertura de código frontend | > 60% |
| Errores de TypeScript | 0 |
| Warnings de ESLint | 0 críticos |

### UX

| Métrica | Valor Objetivo | Cómo Medir |
|---------|----------------|------------|
| Tiempo para primera interacción | < 1s | User testing |
| Errores de UI reportados | 0 bloqueantes | QA testing |
| Layout persistence | 100% exactitud | Manual testing |

---

## Checklist de Verificación Final

### Principios Inmutables

- [ ] **P1: Núcleo sagrado** - MessageCore no tiene lógica de negocio específica
- [ ] **P2: Núcleo agnóstico a IA** - @fluxcore/core-ai es extensión separada
- [ ] **P3: Gratuito por defecto** - Chat funciona sin extensiones premium
- [ ] **P4: Separación persona/cuenta** - users y accounts están separados
- [ ] **P5: Contactos ≠ Conversaciones** - relationships vs conversations
- [ ] **P6: Contexto limitado** - Límites de 5000/2000 chars aplicados

### Contratos Arquitectónicos (PARTE 9)

- [ ] **9.1 Dual Source of Truth** - Backend + IndexedDB coexisten
- [ ] **9.2 Actor Model** - Trazabilidad completa con actor_type
- [ ] **9.3 Modelo de 4 Capas** - Público, Privado, Relacional, Overlays
- [ ] **9.4 Permisos de Contexto** - read:context.* funcionales
- [ ] **9.5 Direccionalidad** - from_actor_id y to_actor_id
- [ ] **9.6 Firma de Mensajes** - Account firma, user para auditoría
- [ ] **9.7 Estados Canónicos** - MessageStatus implementado
- [ ] **9.8 Adaptadores Pasivos** - WhatsApp solo traduce
- [ ] **9.9 Espacios de Intervención** - automation_controller + enriched_message_space
- [ ] **9.10 Permisos de Extensiones** - Manifest valida acciones

### Panel & Tab System (PARTE 11)

- [ ] **11.3 Límite de 3 containers** - Enforced con diálogo
- [ ] **11.4 Preferir Tab sobre Container** - Lógica implementada
- [ ] **11.5 Pinned containers** - Funcionalidad completa
- [ ] **11.6 Jerarquías padre-hijo** - Parent-child relationships
- [ ] **11.8 Responsive** - Colapsa en pantallas pequeñas
- [ ] **11.9 API pública** - Events y Commands expuestos

### Extensión @fluxcore/core-ai (PARTE 9.11)

- [ ] Es extensión, no parte del núcleo
- [ ] Preinstalada y habilitada por defecto
- [ ] Modos suggest/auto/off funcionan
- [ ] PromptBuilder usa 4 capas de contexto
- [ ] response_delay configurable
- [ ] AISuggestionCard en frontend

---

## Proceso de Validación

### Fase 1: Unit Tests

```bash
# Ejecutar todos los tests
bun test

# Ejecutar suite específica
bun test --filter="MessageCore"
bun test --filter="Actor"
bun test --filter="Panel"
```

### Fase 2: Integration Tests

```bash
# Levantar servidor de prueba
bun run dev

# En otra terminal, ejecutar tests de integración
bun run apps/api/src/test-chat.ts
bun run apps/api/src/test-extensions.ts
bun run apps/api/src/test-workspaces.ts
```

### Fase 3: E2E Tests (Playwright recomendado)

```bash
# Instalar Playwright
bun add -D @playwright/test

# Ejecutar E2E
bunx playwright test
```

### Fase 4: Manual Testing Checklist

#### Flow 1: Usuario nuevo

- [ ] Registrar usuario
- [ ] Crear cuenta personal
- [ ] Crear cuenta business
- [ ] Verificar que core-ai está preinstalada

#### Flow 2: Chat básico

- [ ] Crear relación entre dos cuentas
- [ ] Crear conversación
- [ ] Enviar mensaje
- [ ] Verificar mensaje llega por WebSocket
- [ ] Verificar sugerencia de IA aparece

#### Flow 3: Panel Stack Manager

- [ ] Abrir chat
- [ ] Abrir contacto (debe crear tab, no container)
- [ ] Abrir segundo chat (debe crear tab)
- [ ] Abrir tercer container diferente
- [ ] Intentar abrir cuarto (debe mostrar diálogo)
- [ ] Pinear un container
- [ ] Cerrar todos - verificar pinned permanece
- [ ] Refresh - verificar layout persiste

#### Flow 4: Offline

- [ ] Enviar mensaje
- [ ] Cortar conexión (DevTools Network → Offline)
- [ ] Enviar otro mensaje
- [ ] Verificar mensaje aparece con indicador "pending"
- [ ] Restaurar conexión
- [ ] Verificar mensaje se sincroniza

#### Flow 5: Extensiones

- [ ] Ver extensiones disponibles
- [ ] Instalar extensión de turnos
- [ ] Configurar extensión
- [ ] Desinstalar extensión

---

## Comandos de Verificación Rápida

```bash
# 1. Verificar TypeScript compila sin errores
bun run typecheck

# 2. Verificar ESLint sin errores críticos
bun run lint

# 3. Verificar tests pasan
bun test

# 4. Verificar migraciones aplicadas
bun run db:migrate

# 5. Verificar build de producción
bun run build

# 6. Health check del servidor
curl http://localhost:3000/health
```

---

## Criterios de Go/No-Go para Producción

### GO (todos deben cumplirse)

- [ ] Todos los tests automatizados pasan
- [ ] Checklist de principios inmutables 100% completado
- [ ] Manual testing sin errores bloqueantes
- [ ] Performance dentro de objetivos
- [ ] Documentación actualizada

### NO-GO (cualquiera bloquea)

- [ ] Tests fallando
- [ ] Principio inmutable no cumplido
- [ ] Error crítico en flows principales
- [ ] Performance > 2x del objetivo
- [ ] Vulnerabilidad de seguridad identificada

---

*Plan de validación generado automáticamente por auditoría técnica.*
