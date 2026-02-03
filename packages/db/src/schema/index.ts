// Export all schema tables
export * from './users';
export * from './accounts';
export * from './actors';
export * from './relationships';
export * from './conversations';
export * from './messages';
export * from './media-attachments';
export * from './account-ai-entitlements';
export * from './credits';
export * from './system-admins';
export * from './account-deletion';

// Hito 4: Sistema de Extensiones
export * from './extensions';
export * from './extension-contexts';

// Hito 9: Workspaces Colaborativos
export * from './workspaces';

// COR-007: Automation Rules
export * from './automation-rules';

// Appointments System (migrate-all.ts)
export * from './appointments';

// Hito PC-2: Password Reset
export * from './password-reset-tokens';

// Extension Karen: Website Builder
export * from './website-configs';

// FluxCore: Arquitectura de Asistentes IA
export * from './fluxcore-assistants';
export * from './fluxcore-instructions';
export * from './fluxcore-instruction-versions';
export * from './fluxcore-vector-stores';
export * from './fluxcore-tools';
export * from './fluxcore-assistant-instructions';
export * from './fluxcore-assistant-vector-stores';

// RAG-001: Document Chunks con embeddings vectoriales (pgvector)
export * from './fluxcore-document-chunks';

// RAG-002: Sistema de permisos para compartir assets
export * from './fluxcore-asset-permissions';

// RAG-003: Configuración granular de RAG
export * from './fluxcore-rag-configurations';

// RAG-005: Marketplace de Vector Stores
export * from './fluxcore-marketplace';

// RAG-010: Billing y Usage Tracking
export * from './fluxcore-billing';

// RAG-021: Archivos Centralizados
export * from './fluxcore-files';

// AM-100: Sistema de Gestión de Assets
export * from './assets';
export * from './asset-upload-sessions';
export * from './asset-policies';
export * from './asset-audit-logs';
export * from './message-assets';
export * from './template-assets';
export * from './plan-assets';
export * from './templates';
