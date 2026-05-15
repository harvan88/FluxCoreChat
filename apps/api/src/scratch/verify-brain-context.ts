import { fluxPolicyContextService } from '../services/flux-policy-context.service';

async function verify() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';
    console.log(`[Verify] Resolviendo contexto para cuenta: ${accountId}`);
    
    const context = await fluxPolicyContextService.resolvePolicyOnly(accountId, '65d340af-97ff-4c9b-85d2-b378badeacf4', 'web');
    
    const scheduleTemplate = context.resolvedBusinessProfile.templates?.find(t => t.name.includes('Horarios'));
    
    if (!scheduleTemplate) {
        console.log('❌ No se encontró la plantilla de horarios en el contexto');
        return;
    }

    console.log('✅ Plantilla encontrada en el contexto');
    console.log('--- CONTENIDO RECIBIDO POR EL CEREBRO ---');
    console.log(scheduleTemplate.content);
    console.log('-----------------------------------------');
    
    if (scheduleTemplate.content?.includes('{{system:schedules}}')) {
        console.log('🚨 ERROR: El Cerebro está viendo la etiqueta virgen!');
    } else if (scheduleTemplate.content?.includes('📍 Sede')) {
        console.log('🛡️ ÉXITO: El Cerebro recibe la plantilla TERMINADA (proyectada).');
    } else {
        console.log('⚠️ El contenido parece estar vacío o no proyectado correctamente.');
    }
}

verify().catch(console.error);
