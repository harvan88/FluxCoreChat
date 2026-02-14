# FLUXCORE - DOCUMENTO FUNDACIONAL

> **Este documento es inmutable durante el desarrollo.**  
> Cualquier decisión técnica debe alinearse con los principios aquí definidos.  
> Si algo contradice este documento, el documento gana.

### Modificaciones Autorizadas
| Fecha | Modificación |
|-------|--------------|
| 2024-12-09 | **Mobile-First:** Los DynamicContainer son mobile-first, diseñados para verse perfectamente desde dispositivo móvil. |
| 2026-02-12 | **Template Core:** Integración del sistema de plantillas (Templates) en el núcleo y herramientas para la IA. |
| 2026-02-12 | **Asset Management System:** Integración del sistema unificado de assets (imágenes, documentos, execution plans) como componente central del núcleo. |

---

## PARTE 1: VISIÓN

### ¿Qué es FluxCore?

**Un sistema de mensajería universal, extensible mediante plugins externos, con IA disponible como extensión por defecto.**

```
┌─────────────────────────────────────────────────────────────────┐
│                         FLUXCORE                                 │
│                                                                  │
│   ┌───────────────────────────────────────────────────────┐     │
│   │                    NÚCLEO (CORE)                       │     │
│   │                                                        │     │
│   │   • Chat estable y resistente                         │     │
│   │   • Multi-canal (WhatsApp, Telegram, Web)             │     │
│   │   • Identidades múltiples por persona                 │     │
│   │   • Contextos públicos, privados y relacionales       │     │
│   │   • Gestión de Plantillas (Templates)                 │     │
│   │   • Sistema de Assets y Almacenamiento                │     │
│   │                                                        │     │
│   └───────────────────────────────────────────────────────┘     │
│                            ▲                                     │
│                            │ API estandarizada                   │
│                            ▼                                     │
│   ┌───────────────────────────────────────────────────────┐     │
│   │                   EXTENSIONES                          │     │
│   │                                                        │     │
│   │   • Calendario       • CRM           • Turnos         │     │
│   │   • E-commerce       • Marketing     • Analytics      │     │
│   │   • Multi-sucursal   • Inventario    • [Tu idea]      │     │
│   │                                                        │     │
│   └───────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Analogía Clave

**FluxCore es como WhatsApp + Shopify:**
- El **núcleo** es WhatsApp: chat limpio, estable, universal
- Las **extensiones** son como apps de Shopify: funcionalidad ilimitada encima

### Principios Inmutables

| # | Principio | Implicación |
|---|-----------|-------------|
| 1 | **El núcleo es sagrado** | No se modifica para casos específicos. Las extensiones adaptan. |
| 2 | **Núcleo agnóstico a IA** | La IA es una extensión (`@fluxcore/core-ai`), no parte del núcleo. El núcleo solo persiste, notifica y delega. |
| 3 | **Gratuito por defecto** | Chat + IA básica gratis. Extensions y features avanzados monetizan. |
| 4 | **Separación persona/cuenta** | Una persona puede tener múltiples identidades (cuentas). |
| 5 | **Contactos ≠ Conversaciones** | Puedo tener 1000 contactos, 10 chats activos. |
| 6 | **Contexto limitado por diseño** | 5000 chars por cuenta, 2000 chars por relación. Disciplina, no restricción. |

---

## PARTE 2: MODELO DE IDENTIDAD

### Jerarquía de Entidades

```
PERSONA (user)
│
├─► Tiene LOGIN único (email + password)
│
└─► Posee múltiples CUENTAS (accounts)
    │
    ├─► @gustavo (personal)
    │   └─ Perfil personal, IA para uso diario
    │
    └─► @panaderialaesquina (business)
        ├─ Perfil de negocio, IA para atención
        └─ Workspace con colaboradores
```

### Cuentas (Accounts)

Una **cuenta** es una identidad pública en FluxCore.

```
Account {
  id: UUID
  username: "@panaderialaesquina"     // Único, público
  display_name: "Panadería La Esquina"
  type: "personal" | "business"
  
  // CONTEXTO PÚBLICO (visible para otros)
  profile: {
    bio: "Panadería artesanal desde 1990"
    contact: {
      phone: "+5491122334455"
      address: "Av. Corrientes 1234"
      hours: "Lun-Sáb 7am-8pm"
    }
    business: {
      services: ["Pan artesanal", "Medialunas", "Tortas"]
      policies: ["Solo efectivo", "No delivery"]
    }
  }
  
  // CONTEXTO PRIVADO (accesible para extensiones con permiso)
  private_context: """
    Somos panadería familiar, tercera generación.
    Especialidad: pan de masa madre.
    Stock limitado después de 5pm.
    Cliente difícil = derivar a Marina.
  """ // MAX 5000 caracteres
  
  // NOTA: ai_settings se configura vía extensión @fluxcore/core-ai
  // Ver extension_installations para configuración de IA
}
```

### Relaciones (Relationships)

Una **relación** es un vínculo bilateral entre dos cuentas.

```
Relationship {
  account_a: @juan
  account_b: @panaderialaesquina
  
  // Perspectivas bilaterales
  perspectives: {
    a: {
      saved_name: "Mi panadería"
      tags: ["favoritos", "cerca"]
      status: "active"
    }
    b: {
      saved_name: "Juan - Cliente VIP"
      tags: ["frecuente", "integral"]
      status: "active"
    }
  }
  
  // Contexto relacional UNIFICADO (ambos pueden escribir)
  context: {
    entries: [
      { author: "@juan", content: "Compro pan integral los viernes.", type: "preference" },
      { author: "@panaderia", content: "Cliente VIP desde 2020. Paga efectivo.", type: "note" },
      { author: "@panaderia", content: "Si cancela pedido, ofrecer 10% descuento.", type: "rule" }
    ]
    total_chars: 150  // MAX 2000 chars combinado
  }
  
  last_interaction: timestamp
}
```

### Conversaciones vs Contactos

```
CONTACTO (Relationship)          CONVERSACIÓN (Conversation)
─────────────────────────        ─────────────────────────────
• Existe sin mensajes            • Existe solo con mensajes
• Es mi "agenda"                 • Es mi "bandeja de entrada"
• Puedo tener 10,000             • Tendré ~50 activas
• Tiene contexto para IA         • Tiene historial de mensajes
• Es bilateral                   • Se archiva/cierra
```

---

## PARTE 3: EJEMPLOS CANÓNICOS

### Ejemplo 1: Gustavo y su Panadería

```
PERSONA: Gustavo (user)
├─ email: gustavo@gmail.com
├─ password: ****
│
├─► CUENTA PERSONAL: @gustavo
│   └─ Usa para: familia, amigos, grupos personales
│
└─► CUENTA NEGOCIO: @panaderialaesquina
    ├─ Perfil público con horarios, productos
    ├─ IA responde preguntas frecuentes
    │
    └─► WORKSPACE (porque tiene colaboradores)
        ├─ @gustavo (owner) - acceso total
        ├─ @ana (operadora) - solo responde chats
        ├─ @marina (admin) - configura IA, ve analytics
        └─ @marketingIA (bot) - solo chats asignados

IMPORTANTE:
- Si @gustavo, @ana, @marina chatean entre ellos → conversación PERSONAL
- Esa conversación NO aparece en @panaderialaesquina
- Son cuentas diferentes, aunque operen la misma empresa
```

### Ejemplo 2: Daniel y Felipe (Personal)

```
CUENTA: @daniel.ca ←→ CUENTA: @felipe.lu

RELATIONSHIP:
├─ daniel sobre felipe: "Mi novio. Cumple 15 marzo."
└─ felipe sobre daniel: "Mi novio. Alérgico al maní."

CONVERSACIÓN:
├─ Chat personal normal
├─ IA puede sugerir (si enabled)
└─ Sin extensiones, sin complejidad

La IA de @daniel.ca sabe que Felipe cumple el 15 de marzo.
Puede sugerir: "¡No olvides el cumple de Felipe mañana!"
```

### Ejemplo 3: Peluquería DeLux (Extensión Compleja)

```
CUENTA: @peluqueridelux (business)
├─ Perfil público: servicios, precios, ubicación
├─ IA integrada: responde preguntas básicas + respusta mejorada por IA de extención
│
└─► EXTENSIÓN: Sistema de Turnos
    │
    ├─ Backend propio (monorepo separado)
    ├─ BD propia: turnos, estilistas, servicios
    │
    ├─ TOOLS que provee a la IA:
    │   ├─ check_availability(fecha, servicio)
    │   ├─ create_appointment(cliente, fecha, servicio)
    │   └─ get_stylist_schedule(estilista)
    │
    └─ FLUJO:
        1. Cliente: "Quiero turno mañana 3pm para corte"
        2. IA detecta intención de turno
        3. IA llama tool: check_availability("mañana 3pm", "corte")
        4. Extensión consulta su BD
        5. Extensión retorna: "Disponible con Felipe o Marina"
        6. IA responde: "Tengo disponible mañana 3pm con Felipe o Marina, ¿cuál preferís?"
        7. Cliente: "Con Felipe"
        8. IA llama tool: create_appointment(...)
        9. Extensión crea turno, notifica a @felipe.lu
        10. IA confirma: "¡Listo! Turno confirmado con Felipe mañana 3pm."

EMPLEADO @felipe.lu:
├─ Es una CUENTA PERSONAL separada
├─ Recibe NOTIFICACIÓN del turno en su interfaz personal
├─ NO ve el sistema administrativo de @peluqueridelux
├─ Solo ve: "Turno: María, mañana 3pm, corte"
```

---

## PARTE 4: ARQUITECTURA TÉCNICA

### Estructura del Monorepo

```
fluxcore/
│
├── package.json                 # Bun workspaces
├── turbo.json                   # Build orchestration
│
├── apps/
│   ├── api/                     # Backend Elysia
│   │   ├── src/
│   │   │   ├── core/            # MessageCore, ExtensionHost
│   │   │   ├── routes/          # HTTP endpoints
│   │   │   ├── websocket/       # Real-time
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── web/                     # Frontend React
│       ├── src/
│       │   ├── components/
│       │   ├── store/           # Zustand
│       │   ├── services/        # API client
│       │   └── App.tsx
│       └── package.json
│
├── packages/
│   ├── db/                      # Schema Drizzle + migrations
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── package.json
│   │
│   ├── core/                    # Lógica compartida
│   │   ├── MessageCore.ts
│   │   ├── IntegratedAI.ts
│   │   ├── ExtensionHost.ts
│   │   └── package.json
│   │
│   └── types/                   # Tipos TypeScript
│       ├── index.ts
│       └── package.json
│
└── extensions/                  # Extensions oficiales
    ├── calendar/
    ├── appointments/
    └── README.md
```

### Schema de Base de Datos

```sql
-- ═══════════════════════════════════════════════════════════════
-- CAPA 1: IDENTIDAD
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('personal', 'business')),
  
  -- Contexto público
  profile JSONB DEFAULT '{}'::jsonb,
  
  -- Contexto privado (accesible para extensiones con permiso)
  private_context TEXT CHECK (length(private_context) <= 5000),
  
  -- NOTA: ai_settings se configura vía extension_installations
  -- La extensión @fluxcore/core-ai maneja la configuración de IA
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_a_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  account_b_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Perspectivas bilaterales
  perspective_a JSONB DEFAULT '{"saved_name": null, "tags": [], "status": "active"}'::jsonb,
  perspective_b JSONB DEFAULT '{"saved_name": null, "tags": [], "status": "active"}'::jsonb,
  
  -- Contexto relacional UNIFICADO (estructurado)
  context JSONB DEFAULT '{"entries": [], "total_chars": 0}'::jsonb,
  -- Validación en aplicación: total_chars <= 2000
  
  created_at TIMESTAMP DEFAULT now(),
  last_interaction TIMESTAMP,
  
  UNIQUE(account_a_id, account_b_id)
);

-- ═══════════════════════════════════════════════════════════════
-- CAPA 2: CHAT CORE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('web', 'whatsapp', 'telegram')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  
  -- Desnormalización para performance
  last_message_at TIMESTAMP,
  last_message_text TEXT,
  unread_count_a INTEGER DEFAULT 0,
  unread_count_b INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_account_id UUID NOT NULL REFERENCES accounts(id),
  
  content JSONB NOT NULL,  -- {text, media[], location, buttons[]}
  type VARCHAR(20) NOT NULL CHECK (type IN ('incoming', 'outgoing', 'system')),
  
  -- IA metadata
  generated_by VARCHAR(20) DEFAULT 'human' CHECK (generated_by IN ('human', 'ai')),
  ai_approved_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE message_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  extension_id VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- CAPA 3: PLANTILLAS (CORE)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  variables JSONB DEFAULT '[]'::jsonb, -- Array de metadatos de variables
  tags JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE template_assets (
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL, -- FK a tabla assets
  slot VARCHAR(50) DEFAULT 'default',
  linked_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (template_id, asset_id, slot)
);

-- ═══════════════════════════════════════════════════════════════
-- CAPA 4: ASSETS (CORE)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  workspace_id UUID,
  name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  storage_key TEXT NOT NULL,
  checksum_sha256 CHAR(64),
  scope VARCHAR(50) DEFAULT 'message_attachment',
  status VARCHAR(20) DEFAULT 'ready',
  version INTEGER DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE asset_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  name VARCHAR(100) NOT NULL,
  scope VARCHAR(50) NOT NULL,
  allowed_contexts JSONB, -- Array de "action:channel"
  default_ttl_seconds INTEGER DEFAULT 3600,
  is_active BOOLEAN DEFAULT true
);

-- Relaciones
CREATE TABLE message_assets (
  message_id UUID REFERENCES messages(id),
  asset_id UUID REFERENCES assets(id),
  PRIMARY KEY (message_id, asset_id)
);

CREATE TABLE template_assets (
  template_id UUID REFERENCES templates(id),
  asset_id UUID REFERENCES assets(id),
  PRIMARY KEY (template_id, asset_id)
);

CREATE TABLE plan_assets (
  plan_id UUID NOT NULL, -- Referencia lógica a execution_plan
  asset_id UUID REFERENCES assets(id),
  step_id VARCHAR(100),
  dependency_type VARCHAR(20) DEFAULT 'required', -- required, optional, output
  is_ready BOOLEAN DEFAULT false,
  PRIMARY KEY (plan_id, asset_id)
);

-- ═══════════════════════════════════════════════════════════════
-- CAPA 5: COLABORACIÓN (LAZY - solo cuando se necesita)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(workspace_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- CAPA 6: EXTENSIONES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE extension_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  extension_id VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  installed_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(account_id, extension_id)
);

-- ═══════════════════════════════════════════════════════════════
-- CAPA 7: ENRIQUECIMIENTO FLUXCORE (Opcional/IA)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE fluxcore_template_settings (
  template_id UUID PRIMARY KEY REFERENCES templates(id) ON DELETE CASCADE,
  authorize_for_ai BOOLEAN DEFAULT false,
  ai_usage_instructions TEXT,
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE extension_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id VARCHAR(100) NOT NULL,
  
  -- Solo UNA de estas FK puede estar activa
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  
  context_type VARCHAR(50) NOT NULL,  -- 'summary', 'preferences', 'rules', etc.
  payload JSONB NOT NULL,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Constraint: exactamente una FK activa
  CHECK (
    (account_id IS NOT NULL)::int +
    (relationship_id IS NOT NULL)::int +
    (conversation_id IS NOT NULL)::int = 1
  )
);

-- ═══════════════════════════════════════════════════════════════
-- ÍNDICES
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX idx_accounts_username ON accounts(username);
CREATE INDEX idx_accounts_owner ON accounts(owner_user_id);
CREATE INDEX idx_relationships_a ON relationships(account_a_id);
CREATE INDEX idx_relationships_b ON relationships(account_b_id);
CREATE INDEX idx_conversations_relationship ON conversations(relationship_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_templates_account ON templates(account_id);
```

### Componentes Core

#### MessageCore (Orquestador de Mensajes)

```typescript
// packages/core/MessageCore.ts

/**
 * MessageCore - El corazón del sistema
 * 
 * Responsabilidades:
 * 1. Recibir mensajes de cualquier fuente (adapter, UI)
 * 2. Persistir inmediatamente
 * 3. Notificar via WebSocket
 * 4. Procesar extensiones (enrichments)
 * 5. Entregar mensajes salientes a adapters
 * 
 * NO hace:
 * - Lógica de negocio específica
 * - Orquestación compleja (eso es de extensiones)
 * - Validación de permisos (eso es middleware)
 */
class MessageCore {
  constructor(
    private persistence: IPersistenceService,
    private notifications: INotificationService,
    private extensionHost: IExtensionHost
    // SIN integratedAI - la IA es una extensión (@fluxcore/core-ai)
  ) {}

  async receive(envelope: MessageEnvelope): Promise<ReceiveResult> {
    // 1. Persistir
    await this.persistence.save(envelope);
    
    // 2. Notificar (WebSocket)
    await this.notifications.broadcast(envelope);
    
    // 3. Delegar TODO a extensiones (incluyendo @fluxcore/core-ai)
    if (envelope.type === 'incoming') {
      await this.extensionHost.processMessage(envelope);
    }
    
    return { success: true, messageId: envelope.id };
  }
  
  // NOTA: La lógica de IA se ejecuta en la extensión @fluxcore/core-ai
  // El núcleo NO tiene conocimiento de IA, solo persiste y delega
}

#### TemplateService (Gestión de Plantillas)

```typescript
// apps/api/src/services/template.service.ts

/**
 * TemplateService - Gestiona plantillas del núcleo
 * 
 * Responsabilidades:
 * 1. CRUD de plantillas por cuenta
 * 2. Gestión de assets adjuntos
 * 3. Ejecución (envío) de plantillas con reemplazo de variables
 */
class TemplateService {
  async executeTemplate(params: ExecuteTemplateParams): Promise<Message> {
    // 1. Obtener template + assets
    // 2. Reemplazar {{variables}} en el contenido
    // 3. Enviar mensaje vía MessageCore
    // 4. Vincular assets al mensaje enviado
  }
}

#### AssetRegistryService (Sistema de Assets)

```typescript
// apps/api/src/services/asset-registry.service.ts

/**
 * AssetRegistryService - Punto único para gestión de archivos
 * 
 * Responsabilidades:
 * 1. Gestionar el ciclo de vida de los assets (pending -> ready -> archived)
 * 2. Aplicar deduplicación controlada (intra-account) basada en hashes
 * 3. Gestionar políticas de acceso (TTL, contextos) para URLs firmadas
 * 4. Orquestar la vinculación con mensajes, plantillas y planes de ejecución
 * 
 * Integración con IA:
 * - El sistema trata a la IA como un actor ("actorType: assistant")
 * - Garantiza que la IA solo consuma assets permitidos por su política
 */
```

#### Extensión @fluxcore/core-ai (IA por Defecto)

```typescript
// extensions/core-ai/src/extension.ts

/**
 * @fluxcore/core-ai - Extensión de IA por defecto (preinstalada)
 * 
 * NATURALEZA:
 * - Es una EXTENSIÓN, no parte del núcleo
 * - Viene preinstalada y habilitada por defecto
 * - Puede ser deshabilitada o reemplazada por otra extensión IA
 * 
 * QUÉ HACE:
 * - Construye prompt con contexto (profile + private + relationship)
 * - Llama a Groq (gratis)
 * - Genera sugerencias o respuestas automáticas
 * 
 * QUÉ NO HACE:
 * - Orquestar flujos complejos (eso es de extensiones IA avanzadas)
 * - Llamar tools (eso requiere extensión IA premium)
 * - Acceder a datos sin permisos explícitos
 */
class CoreAIExtension implements IExtension {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async generateResponse(
    message: MessageEnvelope,
    account: Account,
    relationship?: Relationship
  ): Promise<AIResponse> {
    
    // 1. Construir prompt con contextos
    const systemPrompt = this.buildPrompt(account, relationship);
    
    // 2. Llamar Groq (sin tools - core-ai es simple)
    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message.content.text }
      ],
      temperature: 0.7
    });
    
    return {
      text: completion.choices[0].message.content,
      generatedBy: 'ai'
    };
  }

  private buildPrompt(account: Account, relationship?: Relationship): string {
    return `
Eres ${account.display_name}.

INFORMACIÓN PÚBLICA:
${JSON.stringify(account.profile, null, 2)}

${account.private_context ? `
CONTEXTO PRIVADO (usa para responder mejor):
${account.private_context}
` : ''}

${relationship ? `
CONTEXTO DE ESTA PERSONA:
${this.getRelationshipContext(account.id, relationship)}
` : ''}

INSTRUCCIONES:
- Responde de manera natural y útil
- Usa la información de contexto cuando sea relevante
- Si no sabes algo, sé honesto
- Mantén un tono ${account.profile.tone || 'profesional y amigable'}
    `.trim();
  }

  /**
   * Integración con Assets
   * core-ai utiliza el AssetRegistry para:
   * 1. Solicitar URLs firmadas para previsualización de archivos.
   * 2. Declarar dependencias de archivos en Execution Plans (plan_assets).
   * 3. Adjuntar archivos generados a mensajes salientes.
   */
  async handleAssets(assetIds: string[]): Promise<void> {
    // Implementación vía AssetPolicyService
  }
}
```

### Interfaces de Usuario

#### Interfaz Personal (WhatsApp-like)

```
┌─────────────────────────────────────────────────────────────────┐
│  FluxCore                              @gustavo ▾    [⚙️]       │
├──────────────────────┬──────────────────────────────────────────┤
│                      │                                          │
│  🔍 Buscar           │   @panaderialaesquina                    │
│                      │   ─────────────────────────────────────  │
│  ─────────────────── │                                          │
│                      │   [Cliente] Hola, ¿tienen pan integral?  │
│  CONVERSACIONES      │                                     10:30│
│                      │                                          │
│  @juan               │   ✨ Sugerencia IA:                      │
│  ¿A qué hora abren?  │   "¡Hola! Sí, tenemos pan integral      │
│                 10:30│   fresco todos los días. Hoy nos queda   │
│                      │   hasta las 5pm aprox."                  │
│  @maria              │                                          │
│  Gracias! Mañana paso│   [Aprobar] [Editar] [Descartar]        │
│                  Ayer│                                          │
│                      │   ─────────────────────────────────────  │
│  @proveedor          │                                          │
│  Envío confirmado    │   [Escribir mensaje...]           [📎 🎤]│
│                23 Nov│                                          │
│                      │                                          │
└──────────────────────┴──────────────────────────────────────────┘

CARACTERÍSTICAS:
- Simple, limpio, familiar
- Switch de cuenta arriba
- IA sugiere, humano decide
- Sin complejidad innecesaria
```

#### Interfaz Empresarial (VS Code-like)

```
┌─────────────────────────────────────────────────────────────────┐
│  FluxCore Pro              @panaderialaesquina    Marina ▾  [⚙️]│
├──────┬──────────────────────┬───────────────────────┬───────────┤
│      │                      │                       │           │
│ [💬] │  CONVERSACIONES      │  Chat con @juan       │ CONTACTO  │
│      │                      │                       │           │
│ [👥] │  🔍 Buscar           │  [10:30] Juan:        │ Juan Pérez│
│      │                      │  ¿Tienen integral?    │           │
│ [📊] │  Sin leer (5)        │                       │ Tags:     │
│      │  ├─ @juan            │  [10:31] Tú (IA):     │ • VIP     │
│ [🔧] │  ├─ @maria           │  ¡Hola Juan! Sí...    │ • Integral│
│      │  └─ @carlos          │                       │           │
│ [📅] │                      │  [10:35] Juan:        │ Notas:    │
│      │  Respondidos         │  Perfecto, paso 5pm   │ Cliente   │
│      │  └─ @proveedor       │                       │ frecuente │
│      │                      │  ─────────────────    │ desde 2020│
│      │  Archivados          │                       │           │
│      │  └─ (15)             │  [Escribir...]   [📎] │ [Editar]  │
│      │                      │                       │           │
└──────┴──────────────────────┴───────────────────────┴───────────┘

ACTIVITY BAR (izq):
[💬] Conversaciones
[👥] Contactos
[📊] Analytics (extension)
[🔧] Configuración
[📅] Turnos (extension)

CARACTERÍSTICAS:
- Productividad empresarial
- Múltiples paneles
- Extensiones en sidebar
- Contexto siempre visible
```

---

## PARTE 5: EXTENSIONES

### Anatomía de una Extensión

```
extensions/
└── appointments/
    ├── package.json
    ├── manifest.json           # Metadata de la extensión
    ├── src/
    │   ├── index.ts            # Entry point
    │   ├── extension.ts        # Implementa IExtension
    │   ├── tools/              # Tools para IA
    │   │   ├── check-availability.ts
    │   │   └── create-appointment.ts
    │   ├── api/                # Endpoints propios
    │   │   └── routes.ts
    │   └── database/           # Schema propio
    │       └── schema.ts
    └── README.md
```

### Manifest de Extensión

```json
{
  "id": "appointments",
  "name": "Sistema de Turnos",
  "version": "1.0.0",
  "description": "Gestión de turnos y citas",
  "author": "FluxCore",
  
  "permissions": [
    "read:messages",
    "write:enrichments",
    "tools:register"
  ],
  
  "tools": [
    {
      "name": "check_availability",
      "description": "Verifica disponibilidad para un turno",
      "parameters": {
        "type": "object",
        "properties": {
          "date": { "type": "string", "description": "Fecha ISO" },
          "service": { "type": "string", "description": "Servicio solicitado" }
        },
        "required": ["date", "service"]
      }
    },
    {
      "name": "create_appointment",
      "description": "Crea un turno",
      "parameters": {
        "type": "object",
        "properties": {
          "client_account_id": { "type": "string" },
          "date": { "type": "string" },
          "service": { "type": "string" },
          "staff_id": { "type": "string" }
        },
        "required": ["client_account_id", "date", "service"]
      }
    }
  ],
  
  "ui": {
    "sidebar": {
      "icon": "calendar",
      "title": "Turnos"
    }
  }
}
```

### Flujo de Comunicación

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   Cliente   │────►│  FluxCore   │────►│     Extension       │
│  (mensaje)  │     │   (core)    │     │   (appointments)    │
└─────────────┘     └─────────────┘     └─────────────────────┘
                           │                      │
                           │  1. Mensaje llega    │
                           │                      │
                           │  2. IA detecta       │
                           │     intención        │
                           │                      │
                           │  3. IA llama tool ──►│
                           │                      │
                           │  4. Extension ◄──────│
                           │     ejecuta          │
                           │                      │
                           │  5. Retorna ◄────────│
                           │     resultado        │
                           │                      │
                           │  6. IA genera        │
                           │     respuesta        │
                           │                      │
                           ▼                      ▼
```

---

## PARTE 6: API ENDPOINTS

### Autenticación

```
POST /auth/register
  Body: { email, password, name }
  Returns: { user, token }

POST /auth/login
  Body: { email, password }
  Returns: { user, accounts[], token }

POST /auth/logout
  Headers: Authorization: Bearer {token}
```

### Cuentas

```
GET /accounts
  Returns: Account[] del usuario autenticado

POST /accounts
  Body: { username, display_name, type, profile }
  Returns: Account

GET /accounts/:id
  Returns: Account con detalles

PATCH /accounts/:id
  Body: { profile?, private_context? }
  Returns: Account actualizado
  
  // NOTA: ai_settings se configura vía PATCH /extensions/@fluxcore/core-ai/config

GET /accounts/:username/public
  Returns: Perfil público (sin auth)
```

### Relaciones (Contactos)

```
GET /relationships
  Query: { account_id }
  Returns: Relationship[] del account

POST /relationships
  Body: { account_a_id, account_b_id }
  Returns: Relationship

PATCH /relationships/:id
  Body: { saved_name?, tags?, context?, status? }
  Returns: Relationship actualizado
```

### Conversaciones

```
GET /conversations
  Query: { account_id, status? }
  Returns: Conversation[] con último mensaje

GET /conversations/:id
  Returns: Conversation con mensajes

POST /conversations/:id/messages
  Body: { content, type }
  Returns: Message

POST /conversations/:id/messages/:messageId/approve
  Body: { edited_text? }
  Returns: Message enviado
```

### WebSocket

```
WS /realtime?token={jwt}

EVENTOS RECIBIDOS:
- message:new { conversationId, message }
- message:status { messageId, status }
- ai:suggestion { conversationId, suggestion }
- typing:indicator { conversationId, accountId, isTyping }

EVENTOS ENVIADOS:
- typing { conversationId }
- message:read { conversationId, messageId }
```

---

## PARTE 7: PLAN DE IMPLEMENTACIÓN

### Fase 1: Fundamentos (Semana 1-2)

```
OBJETIVO: Usuario puede registrarse, crear cuenta, ver perfil

BACKEND:
├── Setup monorepo (Bun workspaces)
├── Schema DB (users, accounts)
├── Auth endpoints (register, login)
└── Accounts endpoints (CRUD)

FRONTEND:
├── Setup React + Vite
├── Auth pages (login, register)
├── Account switcher
└── Profile editor

ENTREGABLE:
✓ Puedo crear usuario gustavo@gmail.com
✓ Puedo crear cuenta @gustavo (personal)
✓ Puedo crear cuenta @panaderia (business)
✓ Puedo ver/editar perfil
```

### Fase 2: Chat Core (Semana 3-4)

```
OBJETIVO: Dos cuentas pueden chatear

BACKEND:
├── Schema DB (relationships, conversations, messages)
├── MessageCore (copiar y adaptar del código actual)
├── WebSocket server
├── Conversations endpoints
└── Messages endpoints

FRONTEND:
├── Conversations list
├── Chat window
├── Message input
└── WebSocket connection

ENTREGABLE:
✓ @gustavo puede agregar @panaderia como contacto
✓ Pueden intercambiar mensajes
✓ Real-time funciona
```

### Fase 3: Sistema de Extensiones (Semana 5)

```
OBJETIVO: Framework de extensiones + @fluxcore/core-ai

BACKEND:
├── ExtensionHost service
├── Extension manifest loader
├── extension_installations table
├── extension_contexts table (overlays)
└── @fluxcore/core-ai (extensión IA por defecto)

FRONTEND:
├── Extension sidebar
├── AI suggestion UI
├── Approve/Edit/Discard buttons

ENTREGABLE:
✓ Framework de extensiones funcional
✓ @fluxcore/core-ai preinstalada
✓ Cliente escribe → IA sugiere respuesta
✓ Modos: suggest / auto / off (vía config de extensión)
```

### Fase 4: Contexto Relacional (Semana 6)

```
OBJETIVO: IA usa contexto de relación

BACKEND:
├── Context fields en relationships
├── Prompt builder incluye relationship context
└── Relationship endpoints mejorados

FRONTEND:
├── Contact detail panel
├── Context editor
├── Tags management

ENTREGABLE:
✓ Puedo agregar notas a un contacto
✓ IA usa esas notas al responder
✓ "Cliente frecuente, prefiere integral" → IA lo sabe
```

### Fase 5: Extensión de Turnos (Semana 7-8)

```
OBJETIVO: Primera extensión compleja con tools

EXTENSION:
├── Crear monorepo appointments/
├── Schema de BD propia
├── Implementar tools (check_availability, create_appointment)
└── Registrar como extensión IA premium

BACKEND:
├── ToolRegistry para extensiones IA premium
├── Flujo de llamada a tools
└── Notificaciones

FRONTEND:
├── Panel de administración de turnos
├── Vista de agenda

ENTREGABLE:
✓ Extensión de turnos instalable
✓ Extensión IA premium puede llamar tools
✓ Cliente puede agendar turno via chat
```

### Fase 6: Producción (Semana 9-10)

```
OBJETIVO: MVP deployable

BACKEND:
├── WhatsApp adapter real
├── Rate limiting
├── Error handling robusto
└── Logging y monitoring

FRONTEND:
├── Interfaz empresarial (VS Code-like)
├── Polish UI
└── Mobile responsive

INFRA:
├── Docker compose
├── CI/CD básico
└── Backups

ENTREGABLE:
✓ Sistema funciona con WhatsApp real
✓ Interfaz personal y empresarial
✓ Listo para usuarios beta
```

---

## PARTE 8: MÉTRICAS DE ÉXITO

### Core Stability

```
✓ 99.9% uptime
✓ < 100ms latency para mensajes
✓ 0 mensajes perdidos
✓ WebSocket reconecta automáticamente
```

### User Experience

```
✓ Registro < 30 segundos
✓ Primer mensaje < 1 minuto
✓ IA responde < 3 segundos
✓ Interfaz intuitiva (no requiere tutorial)
```

### Extensibility

```
✓ Desarrollador puede crear extensión en < 1 día
✓ Documentación clara
✓ SDK con tipos TypeScript
✓ Ejemplos funcionando
```

---

## GLOSARIO

| Término | Definición |
|---------|------------|
| **User** | Persona con login (email + password) |
| **Account** | Identidad pública (@username) |
| **Relationship** | Vínculo bilateral entre 2 accounts |
| **Conversation** | Hilo de mensajes activo |
| **Workspace** | Espacio colaborativo (lazy) |
| **Extension** | Plugin externo con backend propio |
| **Tool** | Función que la IA puede llamar |
| **Enrichment** | Metadata agregada por extensiones |
| **Private Context** | Contexto secreto para IA (max 5000) |
| **Relationship Context** | Notas unificadas con autoría (max 2000 chars) |
| **ActivityBar** | Barra vertical de íconos de módulos/extensiones |
| **Sidebar** | Columna de navegación dependiente de ActivityBar |
| **ViewPort** | Contenedor madre que aloja Dynamic Containers |
| **Dynamic Container** | Panel funcional con múltiples Tabs |
| **Tab** | Unidad de navegación dentro de un Dynamic Container |
| **Micro-Container** | Componente utilitario de tamaño reducido |
| **Panel Stack Manager** | Subsistema que administra layout y jerarquías |
| **Pinned** | Flag que fija un container para evitar cierre automático |

---

## NOTAS FINALES

### Lo que NO es FluxCore

- ❌ No es un CRM (las extensiones pueden serlo)
- ❌ No es un chatbot builder (la IA es contextual, no programable)
- ❌ No es solo para empresas (funciona igual para uso personal)
- ❌ No es un agregador de canales (es la identidad principal)

### Lo que SÍ es FluxCore

- ✅ Es un sistema de mensajería universal
- ✅ Es una plataforma extensible
- ✅ Es IA contextual accesible para todos
- ✅ Es identidad digital unificada

---

## PARTE 9: CONTRATOS ARQUITECTÓNICOS CANÓNICOS

### 9.1 Dual Source of Truth (Backend + IndexedDB)

FluxCore utiliza un modelo de autoridad dual:

#### Backend = Source of Truth Global

- Garantiza persistencia definitiva
- Mantiene el historial completo y el estado final de todas las entidades
- Permite continuidad multi-dispositivo
- Resuelve conflictos finales

#### IndexedDB = Source of Truth Operativo Local

- Opera como almacenamiento inmediato y offline-first
- Permite interacción sin latencia
- Mantiene una copia local del chat y sus entidades para funcionamiento rápido

#### Reconciliación

Toda entidad local tiene un estado:

```typescript
type SyncState = 
  | 'local_only'      // Solo existe localmente
  | 'pending_backend' // Enviado, esperando confirmación
  | 'synced'          // Confirmado por backend
  | 'conflict';       // Conflicto detectado
```

**Reglas de Reconciliación:**

1. El backend valida y confirma
2. En caso de conflicto: **prevalece backend**
3. Las entidades locales no sincronizadas mantienen prioridad temporal hasta confirmación
4. El frontend puede actuar optimísticamente
5. El backend reconcilia y confirma

---

### 9.2 Actor Model (Unificación de Identidades Internas)

Para soportar múltiples roles, identidades y fuentes de mensajes, FluxCore define una entidad abstracta llamada **Actor**.

#### Atributos del Actor

```typescript
interface Actor {
  actor_id: string;
  actor_type: 'account' | 'user' | 'builtin_ai' | 'extension';
  account_id?: string;    // Si aplica
  user_id?: string;       // Si aplica
  extension_id?: string;  // Si aplica
}
```

#### Uso del Actor Model

Todos los mensajes, interacciones y acciones del sistema registran:

```typescript
interface Message {
  from_actor_id: string;
  to_actor_id: string;
  // ... otros campos
}
```

Esto garantiza trazabilidad unificada para:

- Cuentas empresariales
- Usuarios humanos
- Extensiones IA (incluyendo `@fluxcore/core-ai`)
- Extensiones no-IA
- Adaptadores externos

---

### 9.3 Modelo de Contextos (4 Capas)

FluxCore define un modelo estructurado de contextos en 4 capas:

#### Capa 1: Contexto Público (Core)

```typescript
// accounts.profile (JSONB)
interface PublicContext {
  bio: string;
  contact: { phone, address, hours };
  business: { services, policies };
}
```

- **Persistencia:** Núcleo
- **Visible para:** Todos (público)
- **Límite:** Sin límite estricto

#### Capa 2: Contexto Privado de Account (Core)

```typescript
// accounts.private_context (TEXT, max 5000 chars)
```

- **Persistencia:** Núcleo
- **Visible para:** Extensiones con permiso `read:context.private`
- **Uso:** Instrucciones internas, reglas de negocio, información confidencial

#### Capa 3: Contexto Relacional (Core)

```typescript
// relationships.context (JSONB)
interface RelationshipContext {
  entries: Array<{
    author_account_id: string;
    content: string;
    type: 'note' | 'preference' | 'rule';
    created_at: string;
  }>;
  total_chars: number; // MAX 2000
}
```

- **Persistencia:** Núcleo
- **Visible para:** Extensiones con permiso `read:context.relationship`
- **Uso:** Notas sobre contactos, preferencias, reglas bilaterales

#### Capa 4: Context Overlays (Extensiones)

```typescript
// extension_contexts (tabla separada)
interface ExtensionContext {
  extension_id: string;
  account_id?: string;
  relationship_id?: string;
  conversation_id?: string;
  context_type: string;
  payload: any;
}
```

- **Persistencia:** Por extensión
- **Visible para:** Extensión propietaria + extensiones con `read:context.overlay`
- **Uso:** Resúmenes IA, análisis, datos generados por extensiones

---

### 9.4 Permisos de Contexto

Las extensiones acceden a contextos mediante permisos explícitos en su manifest:

```typescript
type ContextPermission =
  | 'read:context.public'       // Leer profile público
  | 'read:context.private'      // Leer private_context de account
  | 'read:context.relationship' // Leer contexto relacional
  | 'read:context.history'      // Leer historial de mensajes
  | 'read:context.overlay'      // Leer overlays de OTRAS extensiones
  | 'write:context.overlay';    // Escribir overlays propios
```

#### Permisos de @fluxcore/core-ai (extensión IA por defecto)

```json
{
  "id": "@fluxcore/core-ai",
  "permissions": [
    "read:context.public",
    "read:context.private",
    "read:context.relationship",
    "read:context.history",
    "write:context.overlay",
    "send:messages",
    "modify:automation"
  ]
}
```

#### Reglas de Acceso

| Contexto | ¿Quién puede leer? | ¿Quién puede escribir? |
|----------|-------------------|----------------------|
| Público | Todos | Owner de la account |
| Privado | Extensiones con permiso | Owner de la account |
| Relacional | Extensiones con permiso | Ambas partes de la relación |
| Overlays | Extensión propietaria + con permiso | Extensión propietaria |

---

### 9.5 Direccionalidad entre Accounts

Cada relación entre cuentas es **bidireccional**.  
El contexto relacional es **unificado** pero con **autoría** por entrada.

#### Estructura de Mensaje

```typescript
interface MessageEnvelope {
  from_account_id: string;
  to_account_id: string;
  from_actor_id: string;
  to_actor_id: string;
  // ... otros campos
}
```

**Esto permite:**

- Separar contexto "A → B" del contexto "B → A"
- Modelar IA y extensiones que hablan en nombre de la cuenta
- Soportar multi-rol, multi-canal y auditoría precisa

---

### 9.6 Firma de Mensajes (Identidad Pública del Emisor)

Cuando un colaborador humano envía un mensaje desde un workspace empresarial:

1. El mensaje **siempre se firma con la Account dueña del workspace**
2. El `user_id` se utiliza **solo para auditoría y trazabilidad interna**
3. La identidad pública es la **Account**, no la persona
4. La identidad del autor real se obtiene vía:
   - `from_actor_id`
   - `user_id` (interno, no público)

**Ejemplo:**

```
Marina (user) trabaja en @panaderialaesquina (account)
Marina envía: "Hola, ¿qué necesitas?"

Mensaje resultante:
  from_account_id: @panaderialaesquina
  from_actor_id: actor_marina_user
  user_id: marina_uuid (interno)
  
Cliente ve: "@panaderialaesquina dice: Hola, ¿qué necesitas?"
```

---

### 9.7 Estados Canónicos de los Mensajes

Todos los mensajes en FluxCore pasan por uno o varios estados canónicos:

```typescript
type MessageStatus =
  | 'local_only'      // Solo existe localmente
  | 'pending_backend' // Enviado al backend
  | 'synced'          // Confirmado por backend
  | 'sent'            // Enviado al destinatario
  | 'delivered'       // Entregado al destinatario
  | 'seen';           // Visto por el destinatario
```

Los adaptadores externos traducen los estados específicos de cada plataforma a estos estados internos uniformes.

---

### 9.8 Adaptadores (Integración de Webhooks Externos)

Los adaptadores cumplen **una única función**:

1. Reciben el webhook de la plataforma externa
2. Lo convierten a un mensaje FluxCore canónico
3. Lo entregan al ChatCore

#### Mensaje Canónico

```typescript
interface AdapterMessage {
  conversation_id: string;
  from_account_id: string;
  to_account_id: string;
  content: MessagePayload;
  channel: 'web' | 'whatsapp' | 'telegram';
  timestamp: string;
  foreign_message_id: string;  // ID del mensaje en la plataforma externa
}
```

**Los adaptadores NO:**

- ❌ Orquestan
- ❌ Deciden
- ❌ Procesan IA
- ❌ Transforman contenido semántico

**Los adaptadores SÍ:**

- ✅ Traducen formato externo → formato canónico
- ✅ Entregan al ChatCore
- ✅ Traducen estados canónicos → estados externos

---

### 9.9 Extensiones: Límites de Intervención

Las extensiones pueden intervenir en **dos espacios y sólo esos dos**:

#### 9.9.1 automation_controller

Controla el modo de respuesta:

```typescript
type AutomationMode = 
  | 'automatic'   // IA responde automáticamente
  | 'supervised'  // IA sugiere, humano aprueba
  | 'disabled';   // Sin IA
```

Las IA (integrada o extensiones IA) usan este espacio, pero con **permisos validados por el manifest**.

#### 9.9.2 enriched_message_space

Permite generar contenido para ser enviado al cliente:

- Texto
- Componentes estructurados
- Botones
- Elementos interactivos
- Contenidos enriquecidos

**Regla crítica:**

- Este espacio **NO es HTML libre**
- Es un **DSL seguro y controlado** para evitar XSS y mantener coherencia multiplataforma

---

### 9.10 Permisos de Extensiones

El acceso de cada extensión se limita estrictamente a lo definido en su **manifest**:

```json
{
  "permissions": [
    "read:messages",
    "read:stats",
    "write:enrichments",
    "modify:automation",
    "send:messages"
  ]
}
```

El **ChatCore valida cada acción** contra el manifest.

**Violaciones de permisos:**

- Se registran
- Se bloquean
- Se notifican al owner de la account

---

### 9.11 Extensión @fluxcore/core-ai (IA por Defecto)

#### Naturaleza

`@fluxcore/core-ai` es una **extensión**, no parte del núcleo.  
Viene **preinstalada y habilitada por defecto** en todas las cuentas.

**Características:**

- Usa Groq (gratis) como provider por defecto
- Genera sugerencias o respuestas automáticas
- NO orquesta flujos complejos
- NO llama tools (eso es de extensiones IA premium)

#### Contextos que Accede

Mediante sus permisos (`read:context.*`), accede a:

1. **Contexto público** de la Account (perfil, horarios)
2. **Contexto privado** de la Account (instrucciones internas)
3. **Contexto relacional** (notas, preferencias, reglas)
4. **Historial** de la conversación

#### Configuración

Se configura vía `extension_installations.config`:

```typescript
interface CoreAIConfig {
  enabled: boolean;          // Activar/desactivar
  mode: 'suggest' | 'auto' | 'off';
  response_delay: number;    // Segundos antes de auto-responder
  provider?: string;         // 'groq' por defecto
}
```

---

### 9.12 IA Extendida (Extensiones IA Premium)

Son extensiones con capacidades superiores.

#### Capacidades

- ✅ Acceden al `enriched_message_space`
- ✅ Pueden generar contenido complejo
- ✅ Pueden orquestar flows si tienen permisos
- ✅ Pueden responder automáticamente
- ✅ Pueden enviar componentes interactivos
- ✅ Pueden usar tools externas propias

#### Reemplazo Funcional

- Usan los mismos espacios que usa la IA integrada
- Si están activas, **sustituyen y amplían** la IA integrada
- Tienen acceso a tools (si el manifest lo permite)

**Ejemplo:**

```
IA Integrada:
  "Hola, ¿en qué puedo ayudarte?"

IA Extendida (con extensión de turnos):
  "Hola, ¿en qué puedo ayudarte?"
  [Botón: Ver turnos disponibles]
  [Botón: Agendar turno]
```

---

### 9.13 Alias Público de Account

Cada Account tiene:

```typescript
interface Account {
  account_id: string;      // Interno (UUID)
  alias: string;           // Público, único, personalizable
  username: string;        // @username (legacy, puede deprecarse)
}
```

**El alias:**

- Es utilizado para URLs públicas: `fluxcore.com/@panaderia`
- Es usado como identificador memorable
- **No puede cambiarse más de una vez**
- Debe ser único globalmente
- Representa la identidad pública humana-amigable de la Account

---

### 9.14 Espacios de Contenido Permitido (Tipos de Mensaje)

Para evitar HTML libre y permitir contenido complejo, FluxCore define:

```typescript
type MessagePayload =
  | { type: 'text'; content: string }
  | { type: 'rich'; elements: UIElement[] }
  | { type: 'component'; id: string; props: any };

interface UIElement {
  type: 'button' | 'card' | 'list' | 'image' | 'video';
  props: Record<string, any>;
}
```

**Este formato es:**

- ✅ Seguro (no permite XSS)
- ✅ Controlado (validado por schema)
- ✅ Serializable (JSON)
- ✅ Compatible con apps móviles, web y adaptadores externos

---

### 9.15 Interacción entre @fluxcore/core-ai, Extensiones y ChatCore

```
┌─────────────────────────────────────────────────────────────────┐
│                         FLUJO DE IA                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Mensaje incoming llega al ChatCore                          │
│                                                                  │
│  2. ChatCore verifica automation_controller:                    │
│     ├─ disabled → No procesa IA                                 │
│     ├─ supervised → Genera sugerencia                           │
│     └─ automatic → Genera y envía                               │
│                                                                  │
│  3. Si hay extensión IA activa:                                 │
│     ├─ Extensión IA toma control                                │
│     ├─ Puede usar tools                                         │
│     ├─ Puede generar contenido complejo                         │
│     └─ Puede orquestar flows                                    │
│                                                                  │
│  4. Si solo @fluxcore/core-ai está activa:                      │
│     ├─ core-ai genera respuesta simple                          │
│     └─ Usa contextos (público + privado + relacional)           │
│                                                                  │
│  5. Resultado se entrega según modo:                            │
│     ├─ supervised → Sugerencia al humano                        │
│     └─ automatic → Envío directo                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Reglas:**

1. `@fluxcore/core-ai` solo genera sugerencias o mensajes simples
2. Las extensiones IA pueden tomar control si están habilitadas
3. Las extensiones no pueden intervenir fuera de los espacios permitidos
4. Toda acción de extensión se registra con su `from_actor_id`
5. El usuario humano o la account **siempre tiene prioridad de decisión**

---

### 9.16 Acoplamiento Backend ↔ Frontend

El contrato arquitectónico es:

```
Backend:
  ├─ Define el estado global
  ├─ Garantiza persistencia definitiva
  ├─ Resuelve conflictos
  └─ Valida y confirma

Frontend:
  ├─ Ejecuta la versión operativa del estado
  ├─ Permite interacción sin latencia
  ├─ Actúa optimísticamente
  └─ Sincroniza con backend
```

**Ambos comparten:**

- Modelos canónicos de mensajes
- Modelos canónicos de actores
- Modelos canónicos de relaciones

**No existe contradicción conceptual:**  
Es un modelo dual diseñado así.

---

## PARTE 10: TABLA DE DECISIONES ARQUITECTÓNICAS

| Decisión | Razón | Consecuencia |
|----------|-------|--------------|
| **Núcleo agnóstico a IA** | Separación de responsabilidades | IA es extensión (`@fluxcore/core-ai`), no parte del core |
| **Modelo de 4 capas de contexto** | Claridad y permisos granulares | Público, Privado, Relacional, Overlays |
| **Context Overlays** | Extensiones enriquecen sin modificar core | Tabla `extension_contexts` separada |
| **Contexto relacional unificado** | Simplicidad, evitar redundancia | Un solo `context` con entradas + autoría |
| Dual Source of Truth | Offline-first + Multi-dispositivo | Backend y IndexedDB coexisten |
| Actor Model | Unificar identidades internas | Trazabilidad completa |
| Firma con Account | Identidad pública empresarial | `user_id` solo para auditoría |
| Estados canónicos | Uniformidad multi-plataforma | Adaptadores traducen |
| Adaptadores pasivos | Separación de responsabilidades | Solo traducen, no orquestan |
| Espacios de intervención | Seguridad y control | Extensiones limitadas a 2 espacios |
| Permisos de contexto | Control de acceso a datos | `read:context.*`, `write:context.overlay` |
| @fluxcore/core-ai preinstalada | IA gratis por defecto | Configurable, reemplazable |
| IA extendida (premium) | Monetización y valor | Tools, orquestación, flows |
| Alias único | Identidad memorable | No cambiable (excepto 1 vez) |
| DSL de contenido | Seguridad XSS | No HTML libre |
| Límite de 3 containers | Prevenir sobrecarga cognitiva | Smart priority + diálogos confirmación |
| Tabs sobre containers | Reducir proliferación de panels | Mantiene foco de trabajo |
| Layout persistente | Continuidad de experiencia | IndexedDB + sync backend opcional |

---

## PARTE 11: PANEL & TAB SYSTEM (CANON)

### 11.1 Propósito

Definir de forma normativa cómo funcionan el ViewPort, los Dynamic Containers, las Tabs internas y las micro-containers utilitarias. Estas reglas gobiernan el comportamiento por defecto, la interacción del usuario, la API de extensión y la persistencia de layout.

### 11.2 Elementos y Terminología

| Elemento | Descripción |
|----------|-------------|
| **ActivityBar** | Barra vertical de entradas (módulos / extensiones) |
| **Sidebar** | Columna de navegación dependiente del ícono activo en ActivityBar |
| **ViewPort** | Contenedor madre que aloja Dynamic Containers; su tamaño varía según Sidebar/ActivityBar |
| **Dynamic Container** | Panel funcional que ocupa una porción del ViewPort; puede contener múltiples Tabs; puede ser duplicado; puede abrir/contener otros Dynamic Containers en jerarquía |
| **Tab** | Unidad de navegación dentro de un Dynamic Container; cada Tab representa una instancia de vista (ej. Chat #123, Contacto #99, Draft #x) |
| **Micro-Container** | Componente utilitario de reducido tamaño (barra horizontal de herramientas o widgets) que puede aparecer dentro de un Dynamic Container o anidado en una región secundaria del ViewPort; tiene sus propias tabs ligeras |
| **Panel Stack Manager** | Subsistema que administra apertura/cierre, jerarquías, layouts, historial y reglas de prioridad |
| **Pinned (locked)** | Flag que fija un Dynamic Container para evitar cierre automático y mantener posición |

### 11.3 Reglas Generales de Layout

#### Límites Simultáneos
El ViewPort permite hasta **3 Dynamic Containers visibles simultáneamente** (configurable por tenant).

#### Distribución Adaptable
Los Dynamic Containers se adaptan al espacio disponible; al mostrar/ocultar Sidebar o expandir ActivityBar, el ViewPort recalcula distribución.

#### Resizability
Los contenedores son resizables por drag (drag-to-resize); los componentes internos deben usar 100% del ancho asignado del container.

#### Split Modes
Soportar split vertical y split horizontal cuando tenga sentido; no crear layouts con más de 3 columnas visibles por defecto.

#### Persistencia
El último layout activo del usuario (posición, tamaños, containers abiertos y pins) se persiste por cuenta y dispositivo (sync con backend si el usuario lo permite).

### 11.4 Tabs vs Dynamic Containers — Reglas de Apertura

#### Preferir Tab sobre Nuevo Dynamic Container

Acción que abre una vista asociada a un módulo ya presente debe abrir una Tab en el Dynamic Container correspondiente (si existe una instancia adecuada) antes de crear un nuevo Dynamic Container.

**Ejemplo:** al seleccionar "Chat Juan" desde Sidebar, si existe un Dynamic Container "Chats" se abre una nueva Tab allí.

#### Creación de Nuevo Dynamic Container

Solo si:
- a) no existe container apropiado; o
- b) el usuario solicita explícitamente "abrir en nuevo panel"; o
- c) la acción tiene naturaleza contextual que amerita panel separado (ej. workspace full-screen tool).

#### Smart Priority (Comportamiento Restrictivo-Inteligente)

Si el Dynamic Container activo principal contiene una vista de trabajo (ej. chat) y el usuario invoca una herramienta complementaria (ej. estadísticas, contacto), por defecto priorizar apertura por Tab en el mismo container en lugar de abrir un nuevo container, salvo que la herramienta requiera un panel lateral por diseño.

**Esta regla previene proliferación de panels y mantiene foco de trabajo.**

#### Max Panels Reached

Al alcanzar 3 containers visibles, una nueva apertura se intentará como Tab en el container con mayor prioridad; si el usuario insiste en abrir como panel, se muestra diálogo: "máximo panels abiertos — cerrar uno para abrir otro" o la acción crea una Tab en el container activo.

### 11.5 Duplicación, Fijado y Arrastre

#### Duplicación
El usuario puede duplicar cualquier Tab o Dynamic Container (comando "Duplicate"). La duplicación crea una nueva instancia con su propio context ID.

#### Pinned (Lock)
- Un icono de candado en la esquina superior del Dynamic Container marca `pinned=true`
- Pinned containers no se cierran por reglas automáticas (p. ej. "Close all tabs") y permanecen en su posición hasta que el usuario desactiva el pin

#### Drag & Drop
- Las Tabs son draggable entre Dynamic Containers: arrastrar una Tab de un container a otro mueve la instancia allí
- Se admiten reordenamiento de containers dentro del ViewPort
- **Tab-to-panel conversion:** El usuario puede "pop out" una Tab para convertirla en Dynamic Container y viceversa

### 11.6 Jerarquías y Paneles Hijos

#### Panel Stack / Parent-Child
Un Dynamic Container puede abrir un panel hijo (child container) asociado; el Panel Stack Manager mantiene la relación padre→hijo.

#### Comportamiento del Hijo
Por defecto el child se abre como Tab en un secondary container (si existe) o como Tab dentro del mismo parent; si el child tiene complejidad, se sugiere abrirlo en un panel nuevo (con confirmación si el límite de paneles se alcanza).

#### Cierre de Parent
Cerrar un parent no cierra automáticamente los children siempre que estén pinned o duplicados; caso contrario, children pueden cerrarse con confirmación.

### 11.7 Micro-Containers y Layout Interno

#### Micro-Containers
Zonas utilitarias (herramientas) que ocupan poco espacio y pueden distribuirse horizontalmente dentro de un Dynamic Container o en una franja del ViewPort.

#### Tabs Ligeros
Micro-containers soportan tabs ligeros; son independientes de las Tabs principales.

#### Usos
Quick tools, previews, mini-dashboards, paletas de acciones (estilo Photoshop tools).

#### Reglas de Visibilidad
Micro-containers pueden ocultarse automáticamente en pantallas pequeñas y estar accesibles desde un menú flotante.

### 11.8 Comportamiento Responsive y Accesibilidad

#### Pantallas Pequeñas
En width < breakpoint, el ViewPort debe colapsar a un solo Dynamic Container visible, con Tabs apiladas; Sidebar y ActivityBar se pueden autohide.

#### Full-Width Behavior
En pantallas grandes, los containers utilizan el 100% del ancho asignado.

#### Teclado y Accesibilidad
Shortcuts para: cambiar Tab (Ctrl/Cmd+Tab), mover Tab a otro container, fijar/unfix, duplicar, cerrar panel, maximizar/minimizar. Roles ARIA y foco gestionado correctamente.

### 11.9 API / Eventos Públicos (para Frontend & Extensions)

#### 11.9.1 Events (Emitidos por Panel Stack Manager)

```typescript
panel.opened { containerId, tabId?, source }
panel.closed { containerId, tabId?, reason }
panel.pinned { containerId, pinned: true|false }
panel.resized { containerId, width, height }
tab.opened { containerId, tabId, context }
tab.moved { fromContainerId, toContainerId, tabId }
layout.changed { layoutSpec }
```

#### 11.9.2 Commands (Invocables)

```typescript
openTab(containerType, tabContext, options) → returns { containerId, tabId }
openContainer(containerType, options) → returns { containerId }
duplicateContainer(containerId)
pinContainer(containerId, pinnedBoolean)
moveTab(tabId, toContainerId)
resizeContainer(containerId, dims)
getLayout() → layoutSpec
setLayout(layoutSpec)
```

#### 11.9.3 Security / Sanity Checks

- El runtime valida `maxContainers` antes de `openContainer`
- Las extensiones requieren permiso `ui:open_container` para crear containers
- Las acciones que alteran layout persistente requieren permiso `ui:save_layout` (por tenant)

### 11.10 Default Behavior & Recommended UX Policy

#### Default Layout on Login
- ActivityBar visible (icons only)
- Sidebar collapsed until first click
- ViewPort shows placeholder: messages > conversations > chat (chat empty si no seleccionado)

#### Default Open Policy
Abrir una acción desde Sidebar → abrir Tab en container existente si el containerType existe; si no, abrir nuevo Dynamic Container.

#### Smart Priority Rule (Normativa)
Para acciones complementarias a la tarea activa (ej. abrir contacto desde chat), usar Tab prioritaria en el mismo container. El usuario puede override manualmente ("Open in new panel").

#### User Control
Todas las heurísticas pueden ser override por el usuario en settings (ej. "always open new panel for contacts").

#### Max Containers Enforcement
Si se llega al límite y el usuario insiste en abrir nuevo panel, mostrar diálogo con opciones: cerrar panel X / abrir como tab / cancelar.

### 11.11 Notas de Implementación Práctica (Recomendadas)

1. Implementar Panel Stack Manager como capa única en frontend; exponer API a extensions mediante sandbox
2. Store local del layout en IndexedDB + sincronización opcional a backend
3. Animaciones suaves en expand/collapse para evitar saltos de layout
4. Mantener separación entre layout model (datos) y render layer (React components)
5. Tests visuales (snapshots) para combinaciones de 1/2/3 containers + tabs + pinned + duplicated
6. Registrar métricas de uso (cuántos panels abiertos, drag events) para afinar defaults

### 11.12 Ejemplos de Uso Canónicos

#### Abrir Chat desde Sidebar
```typescript
openTab('chatsContainer', { chatId })
// Prefiere tab en container existente
```

#### Ver Contacto desde Chat (Herramienta Complementaria)
```typescript
openTab('chatsContainer', { contactId })
// Smart priority → tab
```

#### Editar Prompt (Operación Compleja)
```typescript
openContainer('editorContainer', { 
  mode: 'promptEdit', 
  parent: chatContainerId 
})
// Pide panel si falta espacio
```

#### Duplicar Chat
```typescript
duplicateContainer(chatContainerId)
// Nueva instancia con tabs separadas
```

### 11.13 Terminología Canónica para el TOTEM

**Panel & Tab System.** El sistema de interfaz del Workspace se organiza en ActivityBar, Sidebar y ViewPort. El ViewPort aloja hasta tres Dynamic Containers simultáneos; cada Dynamic Container gestiona Tabs internas. Por defecto, acciones que abren vistas reusables deben abrir Tabs dentro de containers existentes. Los containers son resizables, duplicables, "pinned" y pueden abrir containers hijos. El Panel Stack Manager expone eventos y comandos para controlar apertura, cierre, pin, duplicado, movimiento de Tabs y persistencia del layout. Las extensiones requieren permisos explícitos para crear containers o alterar layouts persistentes.

---

**Este documento es el norte. Cuando haya dudas, volver aquí.**

```
                    ┌─────────────────┐
                    │                 │
                    │     TOTEM       │
                    │                 │
                    │  No cambia.     │
                    │  No se negocia. │
                    │  Guía todo.     │
                    │                 │
                    └─────────────────┘
```
