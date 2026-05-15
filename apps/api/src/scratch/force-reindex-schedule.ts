import { templateSemanticService } from '../services/fluxcore/template-semantic.service';

async function main() {
    const templateId = '63d63f9a-c7d4-40c4-9430-20b4be0a59c5';
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';

    console.log(`🚀 FORZANDO RE-INDEXACIÓN HIDRATADA PARA PLANTILLA: ${templateId}`);
    await templateSemanticService.syncTemplateVector(templateId, accountId, true);
    console.log(`✅ Sincronización completada.`);
}

main().catch(console.error);
