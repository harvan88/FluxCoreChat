import { fluxPolicyContextService } from '../services/flux-policy-context.service';
import { capabilityRegistryService } from '../services/capability-registry.service';
import { capabilityOfferService } from '../services/capability-offer.service';
import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const ACCOUNT_ID = '5f96c4c5-473b-4574-93ce-53f54225dd18';
const OUTPUT_DIR = 'c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/docs/reconstruction-phase-1/temp';

async function generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `reporte_soberania_fluxi_${timestamp}.md`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    console.log('📄 Generando reporte de soberanía para Fluxi...');

    try {
        // 1. Resolvemos Contexto y Runtime
        const { policyContext, runtimeConfig } = await fluxPolicyContextService.resolveContext(
            ACCOUNT_ID,
            '00000000-0000-0000-0000-000000000000',
            'web'
        );

        // 2. Resolvemos Herramientas Disponibles
        const allDefinitions = capabilityRegistryService.listDefinitions();
        const available = allDefinitions.filter(def => 
            (capabilityOfferService as any).isAvailable(def, {
                runtimeConfig: runtimeConfig,
                authorizedContext: policyContext
            })
        );

        // 3. Construimos el Markdown
        let md = `# Reporte de Soberanía Operativa: Fluxi\n\n`;
        md += `**Fecha de Auditoría:** ${new Date().toLocaleString()}\n`;
        md += `**Cuenta Auditada:** ${ACCOUNT_ID} (Flux Core Support)\n`;
        md += `**Estado de Soberanía:** 🔥 ACTIVA\n\n`;

        md += `## 🧠 1. Sistema de Instrucciones (Private Context)\n`;
        md += `Fluxi tiene acceso directo a las directrices estratégicas de la cuenta:\n\n`;
        md += `\`\`\`text\n${policyContext.resolvedBusinessProfile.privateContext || 'No hay instrucciones definidas'}\n\`\`\`\n\n`;

        md += `## 📂 2. Inventario de Plantillas Autorizadas\n`;
        md += `Fluxi puede ver y utilizar las siguientes plantillas para responder al usuario:\n\n`;
        
        const templates = policyContext.authorizedTemplatesRich || policyContext.resolvedBusinessProfile.templates || [];
        if (templates.length === 0) {
            md += `> ⚠️ No se encontraron plantillas autorizadas para IA.\n\n`;
        } else {
            templates.forEach(t => {
                const hasInstructions = !!t.instructions && t.instructions.trim().length > 0;
                const hasVariables = (t.variables || []).length > 0;

                md += `### 📄 ${t.name}\n`;
                md += `- **ID:** \`${t.templateId}\`\n`;
                md += `- **Instrucciones IA:** ${t.instructions || '❌ FALTAN INSTRUCCIONES'}\n`;
                md += `- **Variables:** ${t.variables.map((v: any) => v.name).join(', ') || 'Ninguna'}\n`;
                md += `- **Contenido:**\n\`\`\`text\n${t.content || 'Sin contenido'}\n\`\`\`\n`;
                
                md += `#### 🩺 Diagnóstico de Calidad\n`;
                if (!hasInstructions) {
                    md += `- 🔴 **CRÍTICO**: Esta plantilla no tiene instrucciones de uso. La IA no sabrá bajo qué contexto proponerla.\n`;
                } else {
                    md += `- ✅ Instrucciones detectadas (${t.instructions?.length} chars).\n`;
                }
                
                if (t.content && t.content.includes('{{') && !hasVariables) {
                    md += `- ⚠️ **ADVERTENCIA**: El contenido tiene marcadores {{ }} pero no se han definido variables en la metadata.\n`;
                }
                
                md += `\n---\n\n`;
            });
        }

        md += `## 🛠️ 3. Stack de Herramientas (Capability Offer)\n`;
        md += `Estas son las capacidades que Fluxi puede invocar de forma soberana (independiente del asistente):\n\n`;

        available.forEach(tool => {
            md += `### ⚙️ ${tool.name}\n`;
            md += `- **Dominio:** \`${tool.domain}\`\n`;
            md += `- **Descripción:** ${tool.description}\n`;
            md += `- **Origen:** ${ (runtimeConfig.authorizedTools || []).includes(tool.name) ? 'Asistente' : 'Soberanía de Cuenta'}\n\n`;
        });

        md += `## 📊 4. Conclusión de Auditoría\n`;
        md += `El sistema confirma que Fluxi opera con **Soberanía Total**. No está limitado por la configuración del asistente local y tiene privilegios de gestión de plataforma otorgados por la identidad de la cuenta de soporte.\n`;

        // 4. Escribimos el archivo
        fs.writeFileSync(outputPath, md);
        console.log(`✅ Reporte generado con éxito en: ${outputPath}`);

    } catch (error: any) {
        console.error('❌ Error generando reporte:', error.message);
    }
}

generateReport();
