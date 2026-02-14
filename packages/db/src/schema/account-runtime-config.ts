import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

/**
 * account_runtime_config
 * 
 * Centraliza la configuración de ejecución (Runtime) por cuenta.
 * Define qué cerebro (WES, Agente, etc.) es el responsable oficial de procesar
 * los mensajes de la cuenta.
 */
export const accountRuntimeConfig = pgTable('account_runtime_config', {
    accountId: uuid('account_id')
        .primaryKey()
        .references(() => accounts.id, { onDelete: 'cascade' }),

    // Runtime ID canónico: '@fluxcore/wes' | '@fluxcore/fluxcore' (Agentes)
    // Define quién es el "dueño" del procesamiento cognitivo.
    activeRuntimeId: varchar('active_runtime_id', { length: 100 })
        .notNull()
        .default('@fluxcore/fluxcore'),

    // Configuración específica del runtime.
    // Para Agentes: puede ser { assistantId: 'uuid' }
    // Para WES: puede ser { defaultWorkDefinitionId: 'uuid' }
    config: jsonb('config').default({}).notNull(),

    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type AccountRuntimeConfig = typeof accountRuntimeConfig.$inferSelect;
export type NewAccountRuntimeConfig = typeof accountRuntimeConfig.$inferInsert;
