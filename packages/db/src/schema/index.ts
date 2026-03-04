// Export all schema tables
export * from './users';
export * from './accounts';
export * from './actors';
export * from './relationships';
export * from './conversations';
export * from './conversation-participants';
export * from './messages';
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

// ChatCore Outbox - Garantiza certificación en Kernel
export * from './chatcore-outbox';

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

// AM-200: Asset Enrichments
export * from './asset-enrichments';

// AM-300: Asset Relationships
export * from './message-assets';
export * from './template-assets';
export * from './plan-assets';

// Template System
export * from './templates';
export * from './fluxcore-template-settings';

// AI Services
export * from './ai-traces';
export * from './ai-signals';
export * from './ai-suggestions';

// FluxCore Agent Architecture
// export * from './fluxcore-agent-assistants'; // Ya existe en fluxcore-agents.ts
export * from './fluxcore-agents';
// Comentados temporalmente hasta que se creen los archivos
// export * from './fluxcore-decision-events';
// export * from './fluxcore-external-effect-claims';
// export * from './fluxcore-external-effects';
// export * from './fluxcore-proposed-works';
// export * from './fluxcore-semantic-contexts';
// export * from './fluxcore-work-definitions';
// export * from './fluxcore-work-events';
// export * from './fluxcore-work-slots';
// export * from './fluxcore-works';

// WES System - Usar el schema consolidado
export * from './wes';

// FluxCore Runtime
export * from './account-runtime-config';
export * from './fluxcore-account-policies';
// Comentados temporalmente hasta que se creen los archivos
// export * from './fluxcore-account-actor-contexts';

// FluxCore Identity System
// Comentados temporalmente hasta que se creen los archivos
// export * from './fluxcore-actors';
// export * from './fluxcore-actor-identity-links';
// export * from './fluxcore-actor-address-links';
// export * from './fluxcore-addresses';

// FluxCore Kernel
// Comentados temporalmente hasta que se creen los archivos
// export * from './fluxcore-fact-types';
export { fluxcoreOutbox, type FluxCoreOutbox, type NewFluxCoreOutbox } from './fluxcore-outbox';
export { fluxcoreProjectorCursors, type FluxCoreProjectorCursors, type NewFluxCoreProjectorCursors } from './fluxcore-projector-cursors';
export { fluxcoreProjectorErrors, type FluxCoreProjectorErrors, type NewFluxCoreProjectorErrors } from './fluxcore-projector-errors';
// export * from './fluxcore-reality-adapters';
// export * from './fluxcore-signals';
// export * from './fluxcore-cognition-queue';
export { fluxcoreActionAudit, type FluxcoreActionAudit, type NewFluxcoreActionAudit } from './fluxcore-action-audit';

// Ontología de Identidad (Projector Space)
export * from './fluxcore-identity';
export { fluxcoreSessionProjection } from './fluxcore-session-projection';

// Kernel Journal — RFC-0001 (Sovereign Reality)
export * from './fluxcore-journal';
export * from './fluxcore-cognition';
