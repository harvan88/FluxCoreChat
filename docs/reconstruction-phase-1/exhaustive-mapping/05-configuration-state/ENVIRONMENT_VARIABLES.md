# ⚙️ Configuration State - Variables y Estado del Sistema

**Fecha:** 2026-03-19  
**Versión:** v8.3  
**Propósito:** Documentación completa de configuración y estado global  
**Metodología:** Análisis de .env, feature flags, configs y estado en memoria

---

## 📋 Índice de Configuración

### 🌍 **Environment Variables**
- [Database Configuration](#database-configuration)
- [API Server Configuration](#api-server-configuration)
- [Authentication & Security](#authentication--security)
- [External Services](#external-services)
- [Development & Debug](#development--debug)

### 🚩 **Feature Flags**
- [Core Features](#core-features)
- [Experimental Features](#experimental-features)
- [Beta Features](#beta-features)
- [Deprecated Features](#deprecated-features)

### ⚙️ **Runtime Configurations**
- [Account-Level Configs](#account-level-configs)
- [Assistant Configs](#assistant-configs)
- [RAG Configurations](#rag-configurations)
- [Tool Configurations](#tool-configurations)

### 💾 **System State**
- [In-Memory State](#in-memory-state)
- [Cache State](#cache-state)
- [Session State](#session-state)
- [WebSocket State](#websocket-state)

---

## 🌍 Environment Variables

### Database Configuration

#### .env.example
```bash
# Database Connection
DATABASE_URL=postgresql://username:password@localhost:5432/fluxcore_chat
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=fluxcore_chat
DATABASE_USER=fluxcore_user
DATABASE_PASSWORD=secure_password

# Database Pool
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE_TIMEOUT=30000

# SSL Configuration
DATABASE_SSL_MODE=prefer
DATABASE_SSL_CERT_PATH=
DATABASE_SSL_KEY_PATH=
DATABASE_SSL_CA_PATH=
```

#### Variables Críticas
- **DATABASE_URL:** Connection string completa
- **DATABASE_POOL_MAX:** Máximo de conexiones concurrentes
- **DATABASE_SSL_MODE:** Modo SSL para producción

### API Server Configuration

#### Server Settings
```bash
# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESS_REQUESTS=false
```

#### File Upload Configuration
```bash
# File Upload
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain
UPLOAD_DESTINATION=uploads/
UPLOAD_TEMP_DIR=temp/

# Static Files
STATIC_FILES_PATH=public/
STATIC_FILES_MAX_AGE=86400000
```

### Authentication & Security

#### JWT Configuration
```bash
# JWT Settings
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
JWT_ISSUER=fluxcore-chat
JWT_AUDIENCE=fluxcore-users

# Session Management
SESSION_SECRET=your-session-secret-key
SESSION_MAX_AGE=86400000
SESSION_SECURE_COOKIES=false
SESSION_HTTP_ONLY=true
```

#### API Keys & External Auth
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_ORG_ID=org-your-org-id
OPENAI_BASE_URL=https://api.openai.com/v1

# Cohere API
COHERE_API_KEY=your-cohere-api-key
COHERE_BASE_URL=https://api.cohere.ai/v1

# Google Vertex AI
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
GOOGLE_PROJECT_ID=your-gcp-project-id
```

### External Services

#### Vector Database Services
```bash
# Pinecone (Alternative Vector DB)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=fluxcore-vectors

# Weaviate (Alternative Vector DB)
WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=your-weaviate-api-key
```

#### Monitoring & Analytics
```bash
# Monitoring
SENTRY_DSN=https://your-sentry-dsn
SENTRY_ENVIRONMENT=development
SENTRY_SAMPLE_RATE=1.0

# Analytics
PLAUSIBLE_DOMAIN=your-domain.com
PLAUSIBLE_API_URL=https://plausible.io/api/event
```

### Development & Debug

#### Development Settings
```bash
# Development
NODE_ENV=development
DEBUG=fluxcore:*
LOG_LEVEL=debug
LOG_PRETTY=true

# Hot Reload
HOT_RELOAD=true
WATCH_FILES=true
```

#### Testing Configuration
```bash
# Testing
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/fluxcore_test
TEST_JWT_SECRET=test-jwt-secret
TEST_OPENAI_API_KEY=test-key
MOCK_EXTERNAL_APIS=true
```

---

## 🚩 Feature Flags

### Core Features

#### Database-Driven Feature Flags
```sql
-- Tabla feature_flags (propuesta)
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  rollout_percentage INTEGER DEFAULT 0,
  account_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Current Feature Flags
```typescript
// apps/api/src/lib/feature-flags.ts
export const FEATURE_FLAGS = {
  // RAG Features
  RAG_HYBRID_SEARCH: process.env.FEATURE_RAG_HYBRID_SEARCH === 'true',
  RAG_RERANKING: process.env.FEATURE_RAG_RERANKING === 'true',
  RAG_OCR_PROCESSING: process.env.FEATURE_RAG_OCR_PROCESSING === 'true',
  
  // Assistant Features
  ASSISTANT_TEMPLATES: process.env.FEATURE_ASSISTANT_TEMPLATES !== 'false', // Default true
  ASSISTANT_TOOLS: process.env.FEATURE_ASSISTANT_TOOLS !== 'false',
  ASSISTANT_MULTI_INSTRUCTIONS: process.env.FEATURE_ASSISTANT_MULTI_INSTRUCTIONS === 'true',
  
  // UI Features
  UI_DARK_MODE: process.env.FEATURE_UI_DARK_MODE === 'true',
  UI_REAL_TIME_COLLABORATION: process.env.FEATURE_UI_REAL_TIME_COLLABORATION === 'true',
  UI_ADVANCED_ANALYTICS: process.env.FEATURE_UI_ADVANCED_ANALYTICS === 'true',
  
  // API Features
  API_RATE_LIMITING: process.env.FEATURE_API_RATE_LIMITING !== 'false',
  API_CACHING: process.env.FEATURE_API_CACHING === 'true',
  API_BATCH_OPERATIONS: process.env.FEATURE_API_BATCH_OPERATIONS === 'true',
} as const;
```

### Experimental Features

#### Behind Flag Features
```typescript
// Features en desarrollo experimental
export const EXPERIMENTAL_FEATURES = {
  // Multi-tenant
  MULTI_TENANT_SUB_ACCOUNTS: process.env.EXP_MULTI_TENANT === 'true',
  MULTI_TENANT_RESOURCE_POOLING: process.env.EXP_MULTI_TENANT_POOLING === 'true',
  
  // Advanced AI
  AI_CUSTOM_MODELS: process.env.EXP_AI_CUSTOM_MODELS === 'true',
  AI_FINE_TUNING: process.env.EXP_AI_FINE_TUNING === 'true',
  AI_MODEL_SWITCHING: process.env.EXP_AI_MODEL_SWITCHING === 'true',
  
  // Real-time
  REAL_TIME_COLLABORATION: process.env.EXP_REAL_TIME === 'true',
  REAL_TIME_VOICE_CHAT: process.env.EXP_REAL_TIME_VOICE === 'true',
  REAL_TIME_VIDEO_CALL: process.env.EXP_REAL_TIME_VIDEO === 'true',
  
  // Advanced Analytics
  ANALYTICS_USAGE_TRACKING: process.env.EXP_ANALYTICS === 'true',
  ANALYTICS_PERFORMANCE_MONITORING: process.env.EXP_PERFORMANCE === 'true',
  ANALYTICS_COST_ANALYSIS: process.env.EXP_COST_ANALYSIS === 'true',
} as const;
```

### Beta Features

#### Features en Beta Testing
```typescript
// Features disponibles para beta testers
export const BETA_FEATURES = {
  // Template System
  TEMPLATE_MARKETPLACE: process.env.BETA_TEMPLATE_MARKETPLACE === 'true',
  TEMPLATE_VERSIONING: process.env.BETA_TEMPLATE_VERSIONING === 'true',
  TEMPLATE_SHARING: process.env.BETA_TEMPLATE_SHARING === 'true',
  
  // Advanced RAG
  RAG_CUSTOM_EMBEDDINGS: process.env.BETA_RAG_CUSTOM_EMBEDDINGS === 'true',
  RAG_ADVANCED_CHUNKING: process.env.BETA_RAG_ADVANCED_CHUNKING === 'true',
  RAG_CONTEXT_OPTIMIZATION: process.env.BETA_RAG_CONTEXT === 'true',
  
  // Assistant Features
  ASSISTANT_PERSONALITY: process.env.BETA_ASSISTANT_PERSONALITY === 'true',
  ASSISTANT_MEMORY: process.env.BETA_ASSISTANT_MEMORY === 'true',
  ASSISTANT_LEARNING: process.env.BETA_ASSISTANT_LEARNING === 'true',
} as const;
```

### Deprecated Features

#### Features siendo eliminados
```typescript
// Features en proceso de deprecación
export const DEPRECATED_FEATURES = {
  // Legacy AI
  LEGACY_AI_ROUTING: process.env.DEPRECATE_LEGACY_AI === 'true',
  LEGACY_TEMPLATE_INJECTION: process.env.DEPRECATE_LEGACY_TEMPLATES === 'true',
  
  // Old UI
  LEGACY_UI_COMPONENTS: process.env.DEPRECATE_LEGACY_UI === 'true',
  LEGACY_ROUTING: process.env.DEPRECATE_LEGACY_ROUTING === 'true',
  
  // Old Storage
  LEGACY_FILE_STORAGE: process.env.DEPRECATE_LEGACY_STORAGE === 'true',
  LEGACY_MEDIA_HANDLING: process.env.DEPRECATE_LEGACY_MEDIA === 'true',
} as const;
```

---

## ⚙️ Runtime Configurations

### Account-Level Configs

#### fluxcore_runtime_configs Table
```sql
-- Estructura de configuración por cuenta
CREATE TABLE fluxcore_runtime_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Configuration Schema
```typescript
interface RuntimeConfig {
  // AI Configuration
  ai: {
    defaultProvider: 'openai' | 'local';
    defaultModel: string;
    maxTokens: number;
    temperature: number;
  };
  
  // Assistant Configuration
  assistants: {
    maxPerAccount: number;
    defaultMode: 'auto' | 'suggest' | 'off';
    enableTools: boolean;
    enableRAG: boolean;
  };
  
  // UI Configuration
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    enableAnimations: boolean;
  };
  
  // Feature Flags Override
  features: {
    [key: string]: boolean;
  };
  
  // Limits and Quotas
  limits: {
    maxConversations: number;
    maxMessagesPerConversation: number;
    maxVectorStores: number;
    maxFileSize: number;
    maxTokensPerMonth: number;
  };
}
```

#### Configuration Loading
```typescript
// apps/api/src/services/runtime-config.service.ts
export class RuntimeConfigService {
  async getConfig(accountId: string): Promise<RuntimeConfig> {
    const config = await db.query.fluxcoreRuntimeConfigs.findFirst({
      where: eq(fluxcoreRuntimeConfigs.accountId, accountId),
      with: {
        account: true
      }
    });
    
    return {
      ...DEFAULT_CONFIG,
      ...config?.config,
      // Feature flags override
      features: {
        ...DEFAULT_CONFIG.features,
        ...this.getFeatureFlags(accountId)
      }
    };
  }
  
  async updateConfig(accountId: string, updates: Partial<RuntimeConfig>): Promise<void> {
    await db.transaction(async (tx) => {
      const current = await tx.query.fluxcoreRuntimeConfigs.findFirst({
        where: eq(fluxcoreRuntimeConfigs.accountId, accountId)
      });
      
      if (current) {
        await tx.update(fluxcoreRuntimeConfigs)
          .set({ 
            config: { ...current.config, ...updates },
            version: current.version + 1,
            updatedAt: new Date()
          })
          .where(eq(fluxcoreRuntimeConfigs.accountId, accountId));
      } else {
        await tx.insert(fluxcoreRuntimeConfigs)
          .values({
            accountId,
            config: { ...DEFAULT_CONFIG, ...updates },
            isActive: true,
            version: 1
          });
      }
    });
  }
}
```

### Assistant Configs

#### Assistant Configuration Schema
```typescript
interface AssistantConfig {
  // Model Configuration
  modelConfig: {
    provider: 'openai' | 'local';
    model: string;
    temperature: number;
    topP: number;
    responseFormat: 'text' | 'json';
    // ⚠️ Campos con inconsistencia UI vs Schema
    tone?: string;
    language?: string;
    useEmojis?: boolean;
  };
  
  // Timing Configuration
  timingConfig: {
    responseDelaySeconds: number;
    smartDelay: boolean;
    mode: 'auto' | 'suggest' | 'off';
    // ⚠️ UI guarda incorrectamente tone/language/useEmojis aquí
  };
  
  // Tool Configuration
  toolConfig: {
    enabledTools: string[];
    toolTimeout: number;
    maxToolCalls: number;
  };
  
  // RAG Configuration
  ragConfig: {
    enabledVectorStores: string[];
    retrievalTopK: number;
    retrievalMinScore: number;
    maxContextTokens: number;
  };
}
```

#### Configuration Inconsistencies
```typescript
// ⚠️ PROBLEMA CRÍTICO IDENTIFICADO
// UI guarda en timingConfig pero schema define en modelConfig

// UI Behavior (AssistantDetail.tsx):
const updateAssistant = (updates: Partial<Assistant>) => {
  // INCORRECTO: Guarda tone en timingConfig
  onUpdate({ 
    timingConfig: { 
      ...assistant.timingConfig, 
      tone: 'formal',  // ← ERROR DEBE ESTAR EN modelConfig
      language: 'es',  // ← ERROR DEBE ESTAR EN modelConfig
      useEmojis: true  // ← ERROR DEBE ESTAR EN modelConfig
    } 
  });
};

// Schema Definition (fluxcore-assistants.ts):
modelConfig: jsonb('model_config').$type<AssistantModelConfig & { 
  tone?: string;      // ← DEFINICIÓN CORRECTA
  language?: string;  // ← DEFINICIÓN CORRECTA
  useEmojis?: boolean; // ← DEFINICIÓN CORRECTA
}>()

timingConfig: jsonb('timing_config').$type<AssistantTimingConfig>() // ← SIN estos campos
```

### RAG Configurations

#### RAG Configuration per Vector Store
```typescript
interface RAGConfiguration {
  // Chunking Configuration
  chunking: {
    strategy: 'fixed' | 'recursive' | 'semantic' | 'sentence' | 'paragraph';
    sizeTokens: number;
    overlapTokens: number;
    separators: string[];
    customRegex?: string;
    minSize: number;
    maxSize: number;
  };
  
  // Embedding Configuration
  embedding: {
    provider: 'openai' | 'cohere' | 'google' | 'azure' | 'local';
    model: string;
    dimensions: number;
    batchSize: number;
    endpointUrl?: string;
    apiKeyRef?: string;
  };
  
  // Retrieval Configuration
  retrieval: {
    topK: number;
    minScore: number; // ⚠️ UI range 0.1-0.7 vs default histórico 0.700
    maxTokens: number;
    hybridSearch: {
      enabled: boolean;
      keywordWeight: number;
    };
    rerank: {
      enabled: boolean;
      provider?: 'cohere' | 'cross-encoder';
      model?: string;
      topN: number;
    };
  };
  
  // Processing Configuration
  processing: {
    supportedMimeTypes: string[];
    ocr: {
      enabled: boolean;
      language: string;
    };
    metadata: {
      extract: boolean;
      fields: string[];
    };
  };
}
```

### Tool Configurations

#### Tool Configuration Schema
```typescript
interface ToolConfiguration {
  // Tool Definition
  definition: {
    name: string;
    description: string;
    category: string;
    version: string;
    author: string;
    tags: string[];
  };
  
  // Input/Output Schema
  schema: {
    input: Record<string, any>;
    output: Record<string, any>;
  };
  
  // Connection Configuration
  connection: {
    name: string;
    description: string;
    configuration: Record<string, any>;
    isActive: boolean;
    isEnabled: boolean;
  };
  
  // Runtime Configuration
  runtime: {
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    maxConcurrentCalls: number;
  };
}
```

---

## 💾 System State

### In-Memory State

#### Server State Management
```typescript
// apps/api/src/state/server-state.ts
export class ServerState {
  private static instance: ServerState;
  
  // Active connections tracking
  private activeConnections: Map<string, WebSocket> = new Map();
  private activeConversations: Map<string, Set<string>> = new Map();
  
  // Cache state
  private configCache: Map<string, RuntimeConfig> = new Map();
  private assistantCache: Map<string, Assistant> = new Map();
  
  // Rate limiting state
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();
  
  // Feature flags cache
  private featureFlagsCache: Map<string, boolean> = new Map();
  private lastFeatureFlagsUpdate: number = 0;
  
  // System metrics
  private metrics: {
    requestsPerSecond: number;
    activeUsers: number;
    memoryUsage: number;
    cpuUsage: number;
  } = {
    requestsPerSecond: 0,
    activeUsers: 0,
    memoryUsage: 0,
    cpuUsage: 0
  };
  
  // State management methods
  addConnection(accountId: string, ws: WebSocket): void {
    this.activeConnections.set(accountId, ws);
    this.updateMetrics();
  }
  
  removeConnection(accountId: string): void {
    this.activeConnections.delete(accountId);
    this.updateMetrics();
  }
  
  joinConversation(accountId: string, conversationId: string): void {
    if (!this.activeConversations.has(conversationId)) {
      this.activeConversations.set(conversationId, new Set());
    }
    this.activeConversations.get(conversationId)!.add(accountId);
  }
  
  leaveConversation(accountId: string, conversationId: string): void {
    const participants = this.activeConversations.get(conversationId);
    if (participants) {
      participants.delete(accountId);
      if (participants.size === 0) {
        this.activeConversations.delete(conversationId);
      }
    }
  }
  
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }
  
  private updateMetrics(): void {
    this.metrics.activeUsers = this.activeConnections.size;
    // Update other metrics...
  }
}
```

### Cache State

#### Redis Cache Configuration
```typescript
// apps/api/src/cache/redis-cache.ts
export class RedisCache {
  private client: Redis;
  
  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }
  
  // Configuration caching
  async getConfig(accountId: string): Promise<RuntimeConfig | null> {
    const key = `config:${accountId}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setConfig(accountId: string, config: RuntimeConfig, ttl: number = 300): Promise<void> {
    const key = `config:${accountId}`;
    await this.client.setex(key, ttl, JSON.stringify(config));
  }
  
  // Assistant caching
  async getAssistant(assistantId: string): Promise<Assistant | null> {
    const key = `assistant:${assistantId}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setAssistant(assistantId: string, assistant: Assistant, ttl: number = 600): Promise<void> {
    const key = `assistant:${assistantId}`;
    await this.client.setex(key, ttl, JSON.stringify(assistant));
  }
  
  // Vector store caching
  async getVectorStore(vectorStoreId: string): Promise<VectorStore | null> {
    const key = `vectorstore:${vectorStoreId}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setVectorStore(vectorStoreId: string, vectorStore: VectorStore, ttl: number = 1800): Promise<void> {
    const key = `vectorstore:${vectorStoreId}`;
    await this.client.setex(key, ttl, JSON.stringify(vectorStore));
  }
  
  // Cache invalidation
  async invalidateConfig(accountId: string): Promise<void> {
    const pattern = `config:${accountId}:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
  
  async invalidateAssistant(assistantId: string): Promise<void> {
    const pattern = `assistant:${assistantId}:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}
```

### Session State

#### Session Management
```typescript
// apps/api/src/session/session-manager.ts
export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  
  createSession(accountId: string, deviceInfo: DeviceInfo): Session {
    const sessionId = generateSessionId();
    const session: Session = {
      id: sessionId,
      accountId,
      deviceInfo,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      permissions: [],
      preferences: {}
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }
  
  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (session && session.isActive) {
      session.lastActivity = new Date();
      return session;
    }
    return null;
  }
  
  invalidateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.delete(sessionId);
    }
  }
  
  getActiveSessions(accountId: string): Session[] {
    return Array.from(this.sessions.values())
      .filter(session => session.accountId === accountId && session.isActive);
  }
  
  cleanupExpiredSessions(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [sessionId, session] of this.sessions) {
      if (now.getTime() - session.lastActivity.getTime() > maxAge) {
        this.invalidateSession(sessionId);
      }
    }
  }
}
```

### WebSocket State

#### WebSocket Connection State
```typescript
// apps/api/src/websocket/websocket-manager.ts
export class WebSocketManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  
  addConnection(accountId: string, ws: WebSocket, connectionId: string): void {
    const connection: WebSocketConnection = {
      id: connectionId,
      accountId,
      ws,
      joinedRooms: new Set(),
      lastPing: new Date(),
      isAuthenticated: false,
      permissions: []
    };
    
    this.connections.set(connectionId, connection);
    
    // Setup heartbeat
    ws.on('pong', () => {
      connection.lastPing = new Date();
    });
    
    // Setup cleanup on disconnect
    ws.on('close', () => {
      this.removeConnection(connectionId);
    });
  }
  
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Leave all rooms
      for (const room of connection.joinedRooms) {
        this.leaveRoom(connectionId, room);
      }
      
      this.connections.delete(connectionId);
    }
  }
  
  joinRoom(connectionId: string, room: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      if (!this.rooms.has(room)) {
        this.rooms.set(room, new Set());
      }
      this.rooms.get(room)!.add(connectionId);
      connection.joinedRooms.add(room);
    }
  }
  
  leaveRoom(connectionId: string, room: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      const roomParticipants = this.rooms.get(room);
      if (roomParticipants) {
        roomParticipants.delete(connectionId);
        if (roomParticipants.size === 0) {
          this.rooms.delete(room);
        }
      }
      connection.joinedRooms.delete(room);
    }
  }
  
  broadcastToRoom(room: string, message: any): void {
    const participants = this.rooms.get(room);
    if (participants) {
      for (const connectionId of participants) {
        const connection = this.connections.get(connectionId);
        if (connection && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(JSON.stringify(message));
        }
      }
    }
  }
  
  sendToConnection(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }
  
  getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    roomsCount: number;
  } {
    const activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.ws.readyState === WebSocket.OPEN).length;
    
    return {
      totalConnections: this.connections.size,
      activeConnections,
      roomsCount: this.rooms.size
    };
  }
}
```

---

## 📊 Configuration Management

### Configuration Loading Priority

```
1. Environment Variables (highest priority)
2. Database Runtime Configs
3. Feature Flags (database-driven)
4. Default Values (lowest priority)
```

### Configuration Validation

#### Schema Validation
```typescript
// apps/api/src/validation/config-validator.ts
import { z } from 'zod';

const RuntimeConfigSchema = z.object({
  ai: z.object({
    defaultProvider: z.enum(['openai', 'local']),
    defaultModel: z.string().min(1),
    maxTokens: z.number().min(1).max(100000),
    temperature: z.number().min(0).max(2),
  }),
  
  assistants: z.object({
    maxPerAccount: z.number().min(1).max(100),
    defaultMode: z.enum(['auto', 'suggest', 'off']),
    enableTools: z.boolean(),
    enableRAG: z.boolean(),
  }),
  
  ui: z.object({
    theme: z.enum(['light', 'dark', 'auto']),
    language: z.string().min(2).max(10),
    timezone: z.string(),
    enableAnimations: z.boolean(),
  }),
  
  features: z.record(z.boolean()),
  
  limits: z.object({
    maxConversations: z.number().min(1),
    maxMessagesPerConversation: z.number().min(1),
    maxVectorStores: z.number().min(1),
    maxFileSize: z.number().min(1),
    maxTokensPerMonth: z.number().min(1),
  }),
});

export function validateRuntimeConfig(config: unknown): RuntimeConfig {
  return RuntimeConfigSchema.parse(config);
}
```

### Configuration Updates

#### Real-time Configuration Updates
```typescript
// apps/api/src/services/config-update.service.ts
export class ConfigUpdateService {
  async updateAccountConfig(accountId: string, updates: Partial<RuntimeConfig>): Promise<void> {
    // Validate updates
    const validatedUpdates = validateRuntimeConfig(updates);
    
    // Update database
    await this.runtimeConfigService.updateConfig(accountId, validatedUpdates);
    
    // Invalidate cache
    await this.cacheService.invalidateConfig(accountId);
    
    // Notify connected clients
    this.notifyConfigUpdate(accountId, validatedUpdates);
    
    // Log configuration change
    await this.logConfigChange(accountId, validatedUpdates);
  }
  
  private async notifyConfigUpdate(accountId: string, updates: Partial<RuntimeConfig>): Promise<void> {
    const message = {
      type: 'config_update',
      accountId,
      updates,
      timestamp: new Date().toISOString()
    };
    
    // Send to all connected clients for this account
    this.websocketManager.broadcastToAccount(accountId, message);
  }
  
  private async logConfigChange(accountId: string, updates: Partial<RuntimeConfig>): Promise<void> {
    await this.auditService.log({
      action: 'config_update',
      accountId,
      changes: updates,
      timestamp: new Date(),
      userAgent: 'system'
    });
  }
}
```

---

## 🚨 Configuration Issues Identified

### 1. **Assistant Configuration Inconsistency**
**Problem:** UI saves `tone`, `language`, `useEmojis` in `timingConfig` but schema defines them in `modelConfig`
**Impact:** Data stored in wrong location, potential data loss
**Fix Required:** Move UI to save in `modelConfig` or move schema to `timingConfig`

### 2. **RAG Score Range Mismatch**
**Problem:** UI allows 0.1-0.7 range but historical default was 0.700 (too high)
**Impact:** Ineffective retrieval with high scores
**Status:** Partially fixed, default changed to 0.300

### 3. **Feature Flags Scattered**
**Problem:** Feature flags defined in multiple places (env, code, database)
**Impact:** Inconsistent feature availability
**Solution:** Centralize in database with runtime caching

### 4. **Configuration Cache Invalidation**
**Problem:** Cache not properly invalidated when configuration changes
**Impact:** Stale configuration served to clients
**Solution:** Implement proper cache invalidation strategy

---

## 🔮 Future Configuration Enhancements

### Planned Improvements

1. **Centralized Configuration Service**
   - Single source of truth for all configuration
   - Real-time updates to all clients
   - Configuration versioning and rollback

2. **Environment-Specific Configurations**
   - Development, staging, production configs
   - Automatic config validation per environment
   - Configuration inheritance and overrides

3. **Advanced Feature Flagging**
   - Percentage-based rollouts
   - User segment targeting
   - A/B testing integration

4. **Configuration Analytics**
   - Configuration usage tracking
   - Performance impact analysis
   - Configuration optimization recommendations

### Implementation Roadmap

```
Q2 2026: Centralized Configuration Service
- Unified config API
- Real-time updates
- Cache invalidation

Q3 2026: Advanced Feature Flags
- Database-driven flags
- Percentage rollouts
- User targeting

Q4 2026: Configuration Analytics
- Usage tracking
- Performance monitoring
- Optimization insights
```
