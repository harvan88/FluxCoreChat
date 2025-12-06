# Plan Técnico de Ejecución para FluxCore

> **Documento de Implementación derivado del TOTEM**  
> Fecha: 2024-12-06  
> Este documento traduce la visión en tareas ejecutables.

---

## Backlog Estructurado por Hitos

### Hito 0: Bootstrap del Monorepo

**Duración:** 2-3 días

| ID | Descripción | Prioridad | Componentes |
|----|-------------|-----------|-------------|
| FC-001 | Inicializar monorepo con Bun workspaces | Alta | Infra |
| FC-002 | Configurar Turbo para build orchestration | Alta | Infra |
| FC-003 | Crear package `@fluxcore/types` | Alta | Shared |
| FC-004 | Crear package `@fluxcore/db` con Drizzle | Alta | Backend |
| FC-005 | Setup ESLint + Prettier compartido | Media | Infra |
| FC-006 | Crear app `api` con Elysia básico | Alta | Backend |
| FC-007 | Crear app `web` con Vite + React | Alta | Frontend |
| FC-008 | Configurar variables de entorno | Media | Infra |

---

### Hito 1: Fundamentos de Identidad

**Duración:** 2 semanas

**Puntos clave:**
- `ai_settings` se configura vía extensión `@fluxcore/core-ai`
- `private_context` es accesible para extensiones con permiso

| ID | Descripción | Prioridad | Dependencias | Notas |
|----|-------------|-----------|--------------|-------|
| FC-010 | Schema SQL: `users` | Alta | FC-004 | - |
| FC-011 | Schema SQL: `accounts` (sin ai_settings) | Alta | FC-010 | ai_settings va en extensión |
| FC-012 | Schema SQL: `actors` | Alta | FC-010 | - |
| FC-013-030 | Auth endpoints + Frontend | Alta | - | - |

**Schema `accounts`:**
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES users(id),
  username VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL,
  profile JSONB DEFAULT '{}'::jsonb,
  private_context TEXT CHECK (length(private_context) <= 5000),
  -- SIN ai_settings (va en extension_installations)
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

---

### Hito 2: Chat Core

**Duración:** 2 semanas

**Puntos clave:**
- Contexto relacional unificado con autoría
- MessageCore delega a extensiones (sin IA embebida)

| ID | Descripción | Prioridad | Dependencias | Notas |
|----|-------------|-----------|--------------|-------|
| FC-040 | Schema SQL: `relationships` con contexto unificado | Alta | FC-011 | Contexto estructurado con autoría |
| FC-041 | Schema SQL: `conversations` | Alta | FC-040 | - |
| FC-042 | Schema SQL: `messages` | Alta | FC-041 | - |
| FC-043 | Schema SQL: `message_enrichments` | Media | FC-042 | - |
| FC-050 | MessageCore service (delega a extensiones) | Alta | FC-049 | Sin IA embebida |
| FC-044-066 | Endpoints + WebSocket + Frontend | Alta | - | - |

**Schema `relationships`:**
```sql
CREATE TABLE relationships (
  id UUID PRIMARY KEY,
  account_a_id UUID NOT NULL REFERENCES accounts(id),
  account_b_id UUID NOT NULL REFERENCES accounts(id),
  
  -- Perspectivas bilaterales (sin contexto)
  perspective_a JSONB DEFAULT '{"saved_name": null, "tags": [], "status": "active"}'::jsonb,
  perspective_b JSONB DEFAULT '{"saved_name": null, "tags": [], "status": "active"}'::jsonb,
  
  -- Contexto UNIFICADO con autoría
  context JSONB DEFAULT '{"entries": [], "total_chars": 0}'::jsonb,
  
  created_at TIMESTAMP DEFAULT now(),
  last_interaction TIMESTAMP,
  UNIQUE(account_a_id, account_b_id)
);
```

**MessageCore:**
```typescript
class MessageCore {
  constructor(
    private persistence: IPersistenceService,
    private notifications: INotificationService,
    private extensionHost: IExtensionHost
    // SIN integratedAI
  ) {}

  async receive(envelope: MessageEnvelope): Promise<ReceiveResult> {
    await this.persistence.save(envelope);
    await this.notifications.broadcast(envelope);
    
    if (envelope.type === 'incoming') {
      // Delegar TODO a extensiones (incluyendo @fluxcore/core-ai)
      await this.extensionHost.processMessage(envelope);
    }
    
    return { success: true, messageId: envelope.id };
  }
}
```

---

### Hito 3: Workspace UI

**Duración:** 2 semanas

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| FC-080-097 | Panel Stack Manager, ActivityBar, Sidebar, ViewPort, etc. | Alta |

---

### Hito 4: Sistema de Extensiones

**Duración:** 2 semanas

**Puntos clave:**
- Tabla `extension_contexts` para Context Overlays
- Permisos de contexto granulares
- Debe completarse antes de implementar @fluxcore/core-ai

| ID | Descripción | Prioridad | Dependencias | Notas |
|----|-------------|-----------|--------------|-------|
| FC-150 | Schema SQL: `extension_installations` | Alta | FC-011 | - |
| FC-151 | Schema SQL: `extension_contexts` | Alta | FC-150 | Context Overlays |
| FC-152 | Interface IExtension | Alta | FC-003 | - |
| FC-153 | Interface IExtensionManifest con permisos | Alta | FC-152 | Incluye permisos de contexto |
| FC-154 | ExtensionHost service | Alta | FC-153 | - |
| FC-155 | ManifestLoader | Alta | FC-154 | - |
| FC-156 | PermissionValidator | Alta | FC-154 | Valida permisos de contexto |
| FC-157 | ContextAccessService | Alta | FC-156 | Acceso controlado a contextos |
| FC-158-166 | Endpoints + Frontend | Alta | - | - |

**Nueva tabla `extension_contexts`:**
```sql
CREATE TABLE extension_contexts (
  id UUID PRIMARY KEY,
  extension_id VARCHAR(100) NOT NULL,
  
  -- Solo UNA de estas FK puede estar activa
  account_id UUID REFERENCES accounts(id),
  relationship_id UUID REFERENCES relationships(id),
  conversation_id UUID REFERENCES conversations(id),
  
  context_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  CHECK (
    (account_id IS NOT NULL)::int +
    (relationship_id IS NOT NULL)::int +
    (conversation_id IS NOT NULL)::int = 1
  )
);
```

**Permisos de contexto:**
```typescript
type ContextPermission =
  | 'read:context.public'
  | 'read:context.private'
  | 'read:context.relationship'
  | 'read:context.history'
  | 'read:context.overlay'
  | 'write:context.overlay';
```

---

### Hito 5: @fluxcore/core-ai

**Objetivo:** Extensión de IA por defecto, preinstalada y habilitada.

**Duración:** 1.5 semanas

**Dependencias:** Hito 4 (Sistema de Extensiones) DEBE estar completo.

| ID | Descripción | Prioridad | Dependencias | Notas |
|----|-------------|-----------|--------------|-------|
| **FC-170** | Crear extensión `@fluxcore/core-ai` | Alta | FC-154 | Nueva extensión en `extensions/core-ai/` |
| **FC-171** | Definir manifest.json de core-ai | Alta | FC-170 | Permisos: `read:context.*`, `send:messages`, etc. |
| **FC-172** | Implementar PromptBuilder | Alta | FC-170 | Combina profile + private + relationship + history |
| **FC-173** | Integrar Groq SDK | Alta | FC-172 | API key en config de extensión |
| **FC-174** | Implementar modos suggest/auto/off | Alta | FC-173 | Configurable vía `extension_installations.config` |
| **FC-175** | Implementar cola de respuestas con delay | Media | FC-174 | response_delay configurable |
| **FC-176** | Pre-instalar core-ai en nuevas cuentas | Alta | FC-171 | Hook en creación de account |
| **FC-177** | Evento WS: `ai:suggestion` | Alta | FC-174 | Envía sugerencia al frontend |
| **FC-178** | Crear componente AISuggestionCard | Alta | FC-177 | Aprobar/Editar/Descartar |
| **FC-179** | Panel de configuración de @fluxcore/core-ai | Media | FC-165 | En settings de extensión |

**Manifest de @fluxcore/core-ai:**
```json
{
  "id": "@fluxcore/core-ai",
  "name": "FluxCore AI",
  "version": "1.0.0",
  "description": "IA contextual por defecto",
  "author": "FluxCore",
  "preinstalled": true,
  "permissions": [
    "read:context.public",
    "read:context.private",
    "read:context.relationship",
    "read:context.history",
    "write:context.overlay",
    "send:messages",
    "modify:automation"
  ],
  "config_schema": {
    "enabled": { "type": "boolean", "default": true },
    "mode": { "type": "string", "enum": ["suggest", "auto", "off"], "default": "suggest" },
    "response_delay": { "type": "number", "default": 30 }
  }
}
```

---

### Hito 6: Contexto Relacional

**Duración:** 1 semana

**Puntos clave:**
- Contexto unificado con autoría por entrada
- Límite 2000 chars total
- Tipos de entrada: note, preference, rule

| ID | Descripción | Prioridad | Dependencias |
|----|-------------|-----------|--------------|
| FC-130 | Extender PromptBuilder con relationship context | Alta | FC-172 |
| FC-131 | Validar límite 2000 chars total | Alta | FC-040 |
| FC-132 | Componente ContactDetailPanel | Alta | FC-060 |
| FC-133 | Componente RelationshipContextEditor (estructurado) | Alta | FC-132 |
| FC-134 | Componente TagsEditor | Media | FC-132 |
| FC-135 | Guardado optimista de context | Media | FC-133 |
| FC-136 | Selector de tipo de entrada (note/preference/rule) | Media | FC-133 |

**UI de contexto estructurado:**
```typescript
interface ContextEntry {
  author_account_id: string;
  content: string;
  type: 'note' | 'preference' | 'rule';
  created_at: string;
}

// En UI: lista de entries con chips por tipo
// [preference] "Prefiere pan integral"
// [rule] "Si cancela, ofrecer 10% descuento"
// [note] "Cliente VIP desde 2020"
```

---

### Hito 7: Extensión de Turnos

**Duración:** 2 semanas

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| FC-180-191 | Extensión appointments con tools | Alta |

**Nota:** Las tools se registran para extensiones IA premium (no para @fluxcore/core-ai).

---

### Hito 8: Adaptadores (WhatsApp)

**Duración:** 2 semanas

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| FC-200-210 | WhatsApp adapter | Alta |

---

### Hito 9: Workspaces Colaborativos

**Duración:** 1.5 semanas

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| FC-220-229 | Workspaces, members, roles | Alta |

---

### Hito 10: Producción Ready

**Duración:** 2 semanas

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| FC-240-255 | CI/CD, tests, docs, deploy | Alta |

---

## Cronograma de Ejecución

```
Semana 1:     Hito 0 - Bootstrap
Semana 2-3:   Hito 1 - Identidad
Semana 4-5:   Hito 2 - Chat Core
Semana 6-7:   Hito 3 - Workspace UI
Semana 8-9:   Hito 4 - Sistema de Extensiones
Semana 10:    Hito 5 - @fluxcore/core-ai
Semana 11:    Hito 6 - Contexto Relacional
Semana 12-13: Hito 7 - Extensión Turnos
Semana 14-15: Hito 8 - WhatsApp
Semana 16:    Hito 9 - Workspaces
Semana 17-18: Hito 10 - Producción

Total: ~18 semanas
```

---

## Decisiones Arquitectónicas Clave

### IA como Extensión

**Decisión:** La IA NO es parte del núcleo. Es una extensión preinstalada (`@fluxcore/core-ai`).

**Justificación:**
- Núcleo más simple y estable
- IA puede actualizarse independientemente
- Modelo de negocio: core-ai gratis, extensiones IA premium monetizan
- Permite reemplazar/deshabilitar IA completamente

**Impacto:** MessageCore no tiene dependencia a IA, solo delega a extensiones.

### Context Overlays

**Decisión:** Las extensiones tienen su propio espacio de contexto (`extension_contexts`).

**Justificación:**
- Extensiones no modifican datos del núcleo
- Aislamiento entre extensiones
- Permisos granulares de lectura

**Impacto:** Nueva tabla, nuevos permisos.

### Contexto Relacional Unificado

**Decisión:** Un solo `context` JSONB con entries estructurados, no dos campos direccionales.

**Justificación:**
- Evita redundancia con historial de mensajes
- Más flexible: permite tipos (note, preference, rule)
- Mantiene autoría por entrada

**Impacto:** Schema de relationships cambia.

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Extensión core-ai falla | Media | Alto | Fallback: núcleo funciona sin IA |
| Permisos de contexto complejos | Media | Medio | UI clara de permisos en manifest |
| Crecimiento de overlays | Alta | Medio | Límites por plan, cleanup policies |
| Complejidad de extensiones | Media | Medio | SDK bien documentado, ejemplos |

---

## Checklist Pre-Implementación

- [ ] Revisar TOTEM antes de comenzar cada hito
- [ ] Definir límites por plan (chars de overlay, etc.)
- [ ] Configurar entorno de desarrollo
- [ ] Establecer convenciones de código

---

**Este documento es la guía de ejecución. El TOTEM es la guía de arquitectura.**
