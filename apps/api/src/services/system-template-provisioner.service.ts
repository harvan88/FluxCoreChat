import { db, templates, fluxcoreTemplateSettings } from '@fluxcore/db';
import { eq, and, sql } from 'drizzle-orm';
import { coreEventBus } from '../core/events';

/**
 * SystemTemplateProvisionerService
 * 
 * Gestiona la provisión de plantillas automáticas del sistema para habilitar
 * capacidades cognitivas específicas (ej: horarios) sin inyección hardcodeada.
 */
export class SystemTemplateProvisionerService {
    private readonly SCHEDULE_TEMPLATE_TAG = 'system:schedule';

    /**
     * Asegura que exista la plantilla de consulta de horarios para una cuenta.
     */
    async ensureScheduleTemplate(accountId: string) {
        console.log(`[SystemTemplateProvisioner] 🛠️ Asegurando plantilla de horarios para account=${accountId}`);

        // 1. Buscar si ya existe por el tag del sistema
        const [existing] = await db.select()
            .from(templates)
            .where(and(
                eq(templates.accountId, accountId),
                sql`${templates.tags} @> ${JSON.stringify([this.SCHEDULE_TEMPLATE_TAG])}::jsonb`
            ))
            .limit(1);

        let templateId: string;

        if (existing) {
            templateId = existing.id;
            // Asegurar que esté activa y autorizada
            if (!existing.isActive || !existing.allowAutomatedUse) {
                await db.update(templates)
                    .set({ isActive: true, allowAutomatedUse: true, updatedAt: new Date() })
                    .where(eq(templates.id, existing.id));
            }
        } else {
            // 2. Crear la plantilla del sistema
            const [inserted] = await db.insert(templates).values({
                accountId,
                name: 'Información de Horarios y Sucursales',
                content: 'Usa la herramienta is_business_open para responder dudas sobre horarios, apertura o disponibilidad de nuestras sedes.',
                category: 'Sistema',
                tags: [this.SCHEDULE_TEMPLATE_TAG],
                isActive: true,
                allowAutomatedUse: true,
            }).returning();
            
            templateId = inserted.id;
            console.log(`[SystemTemplateProvisioner] ✅ Plantilla creada: ${templateId}`);
        }

        // 3. Garantizar que tenga settings de FluxCore AI (Autorización)
        await db.insert(fluxcoreTemplateSettings)
            .values({ 
                templateId, 
                authorizeForAI: true,
                aiUsageInstructions: 'Activar cuando el usuario pregunte por horarios, disponibilidad, direcciones o si el negocio está abierto/cerrado.',
                aiIncludeName: true,
                aiIncludeContent: true,
                aiIncludeInstructions: true
            })
            .onConflictDoUpdate({
                target: [fluxcoreTemplateSettings.templateId],
                set: { authorizeForAI: true, updatedAt: new Date() }
            });

        // 4. Emitir cambio para que el Tamiz Semántico la indexe inmediatamente
        coreEventBus.emit('template.authorization.changed', {
            templateId,
            accountId,
            allowAutomatedUse: true,
        });

        return templateId;
    }
}

export const systemTemplateProvisioner = new SystemTemplateProvisionerService();
