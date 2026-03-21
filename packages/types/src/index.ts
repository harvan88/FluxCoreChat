// ============================================================================
// Tipos que SÍ se usan (mantener)
// ============================================================================
export * from './extensions/extension';
export * from './extensions/manifest';
export * from './extensions/permissions';
export * from './common/enums';
export * from './common/errors';

// ============================================================================
// Alias hacia fuente de verdad real (schema DB)
// ============================================================================
export type Message = import('@fluxcore/db').Message;
export type MessageType = Message['type'];
export type MessageGeneratedBy = Message['generatedBy'];
export type MessageContent = Message['content'];

// Tipos usados en ContactDetails.tsx (verificar)
export type Account = import('@fluxcore/db').Account;
export type Relationship = import('@fluxcore/db').Relationship;

// ============================================================================
// Servicios (mantener si se usan)
// ============================================================================
export * from './services/message-core';
export * from './services/persistence';
export * from './services/notification';
