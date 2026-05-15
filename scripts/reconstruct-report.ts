
import { db, aiTraces, conversations } from '@fluxcore/db';
import { desc, eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function reconstructReport() {
    const conversationId = 'f0f0c12e-b2e2-4e60-9afc-5bc47fbf127e';
    
    console.log(`🔍 Reconstruyendo reporte para conversación: ${conversationId}`);

    // Obtener las últimas trazas de esta conversación
    const traces = await db.select()
        .from(aiTraces)
        .where(eq(aiTraces.conversationId, conversationId))
        .orderBy(desc(aiTraces.createdAt))
        .limit(10);

    if (traces.length === 0) {
        console.log('❌ No se encontraron trazas.');
        return;
    }

    // Filtrar por la interacción de soberanía (donde se inyectó la verdad del mundo)
    const sovereigntyTraces = traces.filter(t => t.metadata && JSON.stringify(t.metadata).includes('ONTOLOGÍA DE TIEMPO'));
    
    let reportContent = `# 🧠 Reporte de Soberanía Temporal (Reconstruido)\n\n`;
    reportContent += `**Conversación:** \`${conversationId}\` | **Fecha:** ${new Date().toLocaleString()}\n\n`;

    traces.reverse().forEach(trace => {
        reportContent += `### 📍 Fase: ${trace.step}\n`;
        reportContent += `**Status:** ${trace.status} | **TraceID:** \`${trace.traceId}\`\n\n`;
        
        if (trace.metadata) {
            reportContent += `#### Detalles:\n\`\`\`json\n${JSON.stringify(trace.metadata, null, 2)}\n\`\`\`\n\n`;
        }
        reportContent += `---\n\n`;
    });

    const fileName = `reporte_soberania_reconstruido_${Date.now()}.md`;
    const filePath = path.join('docs/reconstruction-phase-1/temp', fileName);
    
    fs.writeFileSync(filePath, reportContent);
    
    console.log(`✅ Reporte generado en: ${filePath}`);
}

reconstructReport().catch(console.error);
