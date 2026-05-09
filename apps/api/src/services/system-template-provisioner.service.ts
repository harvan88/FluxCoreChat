import { db, templates, fluxcoreTemplateSettings, accounts } from '@fluxcore/db';
import { eq, and, sql } from 'drizzle-orm';
import { coreEventBus } from '../core/events';
import { templateService } from './template.service';
import { fluxCoreTemplateSettingsService } from './fluxcore/template-settings.service';
import { scheduleService } from './schedule.service';
import { SYSTEM_INSTRUCTIONS } from '../core/constants/instructions';

/**
 * SystemTemplateProvisionerService
 * 
 * Gestiona el ciclo de vida de las plantillas de sistema que habilitan capacidades cognitivas.
 * Implementa la sincronización bidireccional entre el switch de perfil y la autorización de la plantilla.
 */
export class SystemTemplateProvisionerService {
    private readonly SCHEDULE_TEMPLATE_TAG = 'system:schedule';
    private readonly SCHEDULE_INSTRUCTIONS = SYSTEM_INSTRUCTIONS.SCHEDULE_TEMPLATE;


    constructor() {
        // No llamamos a setupListeners en el constructor para evitar problemas de inicialización circular
        // si el servicio se importa antes de que el event bus esté listo.
    }

    /**
     * Configura los listeners para mantener la sincronía bidireccional.
     */
    setupListeners() {
        console.log('[SystemTemplateProvisioner] 🎧 Configurando listeners de sincronización...');
        
        // Cuando cambia la autorización en la plantilla -> Actualizar perfil de cuenta
        coreEventBus.on('fluxcore.template.settings.changed', async (payload: { templateId: string; accountId: string; authorizeForAI: boolean }) => {
            const { templateId, accountId, authorizeForAI } = payload;
            
            try {
                const [template] = await db.select({ tags: templates.tags })
                    .from(templates)
                    .where(eq(templates.id, templateId))
                    .limit(1);

                if (template?.tags && (template.tags as string[]).includes(this.SCHEDULE_TEMPLATE_TAG)) {
                    // Evitar bucle infinito: solo actualizar si el valor es diferente
                    const [account] = await db.select({ aiIncludeLocations: accounts.aiIncludeLocations })
                        .from(accounts)
                        .where(eq(accounts.id, accountId))
                        .limit(1);

                    if (account && account.aiIncludeLocations !== authorizeForAI) {
                        console.log(`[SystemTemplateProvisioner] 🔄 Sincronizando Perfil <- Plantilla (aiIncludeLocations = ${authorizeForAI})`);
                        await db.update(accounts)
                            .set({ aiIncludeLocations: authorizeForAI })
                            .where(eq(accounts.id, accountId));
                        
                        // Emitimos evento de perfil actualizado para invalidar caches de contexto
                        coreEventBus.emit('account.profile.updated', { accountId, aiIncludeLocations: authorizeForAI });
                    }
                }
            } catch (err) {
                console.error('[SystemTemplateProvisioner] Error en sync Plantilla -> Perfil:', err);
            }
        });
    }

    /**
     * Sincroniza la plantilla de horarios con el estado del switch de perfil.
     */
    async syncScheduleTemplate(accountId: string, authorized: boolean) {
        console.log(`[SystemTemplateProvisioner] 🔄 Sincronizando Perfil -> Plantilla (authorized = ${authorized})`);
        const templateId = await this.ensureScheduleTemplate(accountId);
        
        // 1. Actualizar SOLO el flag de autorización en la tabla core (Templates)
        // NO sobrescribimos el content aquí para respetar ediciones manuales del usuario.
        // La variable {{system:schedules}} se resuelve dinámicamente en TemplateRegistryService.
        await db.update(templates)
            .set({ 
                allowAutomatedUse: authorized, 
                updatedAt: new Date() 
            })
            .where(eq(templates.id, templateId));

        // 2. Actualizar el flag en la tabla de extensión (FluxCore Settings)
        await fluxCoreTemplateSettingsService.updateSettings(
            templateId,
            authorized,
            this.SCHEDULE_INSTRUCTIONS,
            { 
                aiIncludeName: true, 
                aiIncludeContent: true, 
                aiIncludeInstructions: true 
            }
        );
    }

    /**
     * Asegura que exista la plantilla de horarios, usando el pipeline oficial de creación.
     */
    async ensureScheduleTemplate(accountId: string) {
        const [existing] = await db.select()
            .from(templates)
            .where(and(
                eq(templates.accountId, accountId),
                sql`${templates.tags} @> ${JSON.stringify([this.SCHEDULE_TEMPLATE_TAG])}::jsonb`
            ))
            .limit(1);

        if (existing) return existing.id;

        console.log(`[SystemTemplateProvisioner] 🏗️ Ingestando plantilla de horarios para account=${accountId}`);
        
        // Usamos la variable dinámica {{system:schedules}} en lugar de inyectar el texto estático.
        // Esto permite que el usuario mueva la variable o agregue texto propio sin perder la actualización de datos.
        const content = `Nuestros horarios de atención son gestionados de forma dinámica para reflejar la realidad de cada sede.\n\n{{system:schedules}}`;

        const template = await templateService.createTemplate(accountId, {
            name: 'Información de Horarios y Sucursales',
            content,
            category: 'Sistema',
            tags: [this.SCHEDULE_TEMPLATE_TAG],
            isActive: true,
            allowAutomatedUse: true // Se crea autorizada por defecto al activar el switch
        });

        // Pipeline de FluxCore: Inicializar settings de IA con instrucciones semánticas ricas
        await fluxCoreTemplateSettingsService.updateSettings(
            template.id,
            true,
            this.SCHEDULE_INSTRUCTIONS,
            { 
                aiIncludeName: true, 
                aiIncludeContent: true, 
                aiIncludeInstructions: true 
            }
        );

        return template.id;
    }
}

export const systemTemplateProvisioner = new SystemTemplateProvisionerService();
