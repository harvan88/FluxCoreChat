import { type FluxPolicyContext } from '@fluxcore/db';
import { type RealityProvider, type RealityFact } from '../reality-registry.service';
import { scheduleService } from '../../schedule.service';
import { DateTime } from 'luxon';

/**
 * ScheduleRealityProvider — CRP v1.0
 * 
 * Provee la "Verdad del Tiempo" a la IA de forma determinista.
 * Implementa la lógica de Soberanía para distinguir entre Sedes y Cuentas.
 */
export class ScheduleRealityProvider implements RealityProvider {
    readonly domain = 'system:schedule';

    async getFact(accountId: string, policyContext: FluxPolicyContext): Promise<RealityFact | null> {
        // 1. Obtener Flags de Soberanía (Soporta Legacy fallback)
        // Nota: En una fase posterior, estos vendrán directamente del policyContext
        // por ahora los extraemos con cautela.
        const includeLocations = (policyContext.resolvedBusinessProfile as any)?.aiIncludeLocations ?? true;
        const includeDigital = (policyContext.resolvedBusinessProfile as any)?.aiIncludeSchedule ?? (policyContext.resolvedBusinessProfile as any)?.aiIncludeScheduleDigital ?? true;

        const facts: string[] = [];
        
        // 2. Resolver Realidad de Sedes (Físico)
        if (includeLocations) {
            console.log(`[CRP:Schedule] Resolviendo sedes para accountId: ${accountId}`);
            const locationSummary = await scheduleService.getScheduleSummary(accountId);
            console.log(`[CRP:Schedule] Resumen obtenido (${locationSummary.length} chars): ${locationSummary.substring(0, 50)}...`);
            facts.push(`### SEDES FÍSICAS Y SUS HORARIOS\n${locationSummary}`);
        }

        // 3. Resolver Realidad de Cuenta (Digital/Global)
        if (includeDigital) {
            const digitalSummary = await this.getDigitalSummary(accountId);
            if (digitalSummary) {
                facts.push(`### HORARIOS DE ATENCIÓN GLOBAL (DIGITAL)\n${digitalSummary}`);
            }
        }

        if (facts.length === 0) return null;

        // 4. Inyectar Veredicto de "Estado Actual" (Ontología de Tiempo)
        // Esto reemplaza la lógica hardcodeada de la Fase 2.5
        const verdict = await this.getOperatingVerdict(accountId, includeLocations, includeDigital, policyContext);

        return {
            domain: this.domain,
            content: `
ONTOLOGÍA DE TIEMPO (VERDAD DEL MUNDO):
${verdict}

${facts.join('\n\n')}
`.trim()
        };
    }

    private async getDigitalSummary(accountId: string): Promise<string | null> {
        return scheduleService.getOwnerSummary('account', accountId);
    }

    private async getOperatingVerdict(accountId: string, checkLocations: boolean, checkDigital: boolean, policyContext: any): Promise<string> {
        let isOpen = false;
        let reason = 'closed';

        if (checkDigital) {
            const digitalStatus = await scheduleService.isBusinessOpen('account', accountId, new Date());
            if (digitalStatus.isOpen) {
                isOpen = true;
                reason = `Digital: ${digitalStatus.reason}`;
            }
        }

        if (checkLocations) {
            const { accountLocations, db } = await import('@fluxcore/db');
            const { eq } = await import('drizzle-orm');
            
            const locations = await db.select({ id: accountLocations.id })
                .from(accountLocations)
                .where(eq(accountLocations.accountId, accountId));

            for (const loc of locations) {
                const status = await scheduleService.isBusinessOpen('location', loc.id, new Date());
                if (status.isOpen) {
                    isOpen = true;
                    reason = `Físico (Sede): ${status.reason}`;
                    break;
                }
            }
        }

        const timezone = policyContext.timezone || policyContext.resolvedBusinessProfile?.timezone || 'America/Argentina/Buenos_Aires';
        const localTime = DateTime.now().setZone(timezone).toFormat('HH:mm');

        return `- Estado Operativo Actual: ${isOpen ? '🟢 ABIERTO AHORA MISMO' : '🔴 CERRADO EN ESTE MOMENTO'}\n- Razón Determinista: ${reason}\n- Hora Local: ${localTime} (${timezone})`;
    }
}
