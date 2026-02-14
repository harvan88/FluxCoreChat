import { db, accountRuntimeConfig } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

/**
 * RuntimeConfigService
 * 
 * Gestiona la soberanía del runtime por cuenta.
 * Determina qué motor (WES o Agentes) es el responsable de procesar la cuenta.
 */
export class RuntimeConfigService {

    /**
     * Obtiene el runtime configurado para una cuenta.
     * Si no existe, devuelve el valor por defecto (Agentes).
     */
    async getRuntime(accountId: string) {
        const [config] = await db
            .select()
            .from(accountRuntimeConfig)
            .where(eq(accountRuntimeConfig.accountId, accountId))
            .limit(1);

        if (!config) {
            return {
                accountId,
                activeRuntimeId: '@fluxcore/asistentes', // Default to Assistants
                config: {}
            };
        }

        return config;
    }

    /**
     * Establece el runtime activo para una cuenta.
     */
    async setRuntime(accountId: string, runtimeId: string, config: any = {}) {
        return await db
            .insert(accountRuntimeConfig)
            .values({
                accountId,
                activeRuntimeId: runtimeId,
                config,
                updatedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: accountRuntimeConfig.accountId,
                set: {
                    activeRuntimeId: runtimeId,
                    config,
                    updatedAt: new Date(),
                }
            });
    }
}

export const runtimeConfigService = new RuntimeConfigService();
