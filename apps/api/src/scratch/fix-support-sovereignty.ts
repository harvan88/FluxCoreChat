import { db, templates, accounts, fluxcoreTemplateSettings } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const ACCOUNT_ID = '5f96c4c5-473b-4574-93ce-53f54225dd18';

async function fixSovereignty() {
    console.log('🛠️  Añadiendo Plantilla de Gestión de Contenido...');

    try {
        const NEW_TEMPLATE_ID = '55e71eea-48be-4e7e-8b19-6886dc4cb705';

        // 1. Crear la plantilla física
        await db.execute(sql`
            INSERT INTO templates (id, account_id, name, content, category, is_active, allow_automated_use)
            VALUES (
                ${NEW_TEMPLATE_ID},
                ${ACCOUNT_ID},
                'SOPORTE_PLANTILLA_CREADA',
                'He creado la nueva plantilla ''{{nombre_plantilla}}'' en tu cuenta. Ya está disponible en tu catálogo. ¿Te gustaría que la autorice ahora mismo para que tu asistente pueda empezar a usarla?',
                'soporte',
                true,
                true
            )
            ON CONFLICT (id) DO UPDATE SET
                content = EXCLUDED.content
        `);

        // 2. Definir instrucciones para todas (incluyendo la nueva)
        const templateFixes = [
            {
                id: '76e71eea-48be-4e7e-8b19-6886dc4cb705', // SOPORTE_OPERACION_EXITOSA
                instructions: 'Úsala ÚNICAMENTE después de haber confirmado que una configuración, ajuste o actualización técnica ha sido completada con éxito en el sistema del cliente.'
            },
            {
                id: '4d3ef7a3-c936-49dc-8a0f-abb8b1f7a764', // SOPORTE_MEJORA_PROMPT
                instructions: 'Úsala para proponer mejoras en las instrucciones (prompts) de un cliente.'
            },
            {
                id: '3ff6088b-984e-44af-969f-89cfe0fe10e7', // SOPORTE_ANALISIS_INICIADO
                instructions: 'Úsala como respuesta inmediata tras recibir un reporte de falla o error.'
            },
            {
                id: NEW_TEMPLATE_ID, // SOPORTE_PLANTILLA_CREADA
                instructions: 'Úsala inmediatamente después de haber creado con éxito una nueva plantilla usando la herramienta platform_manage_template.'
            }
        ];

        for (const fix of templateFixes) {
            await db.execute(sql`
                INSERT INTO fluxcore_template_settings (
                    template_id, ai_usage_instructions, authorize_for_ai,
                    ai_include_name, ai_include_content, ai_include_instructions
                ) VALUES (
                    ${fix.id},
                    ${fix.instructions},
                    true, true, true, true
                )
                ON CONFLICT (template_id) DO UPDATE SET
                    ai_usage_instructions = EXCLUDED.ai_usage_instructions,
                    authorize_for_ai = true
            `);
        }

        // 3. Actualizar Protocolo en Private Context
        const newPrivateContext = `Eres el canal oficial de Soporte y Operaciones de FluxCore. Tu misión es asegurar el éxito operativo de nuestros clientes mediante la gestión técnica y estratégica de sus cuentas.

TUS RESPONSABILIDADES:
1. DIAGNÓSTICO: Analizar problemas de RAG, conectividad o comportamiento de los asistentes de los clientes.
2. CONFIGURACIÓN: Ayudar en la creación de plantillas, ajuste de parámetros de LLM y gestión de archivos.
3. OPTIMIZACIÓN: Proponer mejoras en los prompts de los clientes basándote en el análisis de su telemetría.
4. EDUCACIÓN: Explicar conceptos de soberanía cognitiva y el funcionamiento del Kernel.

PROTOCOLO DE COMUNICACIÓN (USO DE PLANTILLAS):
- Recepción de Reportes: Usa SIEMPRE 'SOPORTE_ANALISIS_INICIADO'.
- Gestión de Contenido: Usa 'SOPORTE_PLANTILLA_CREADA' tras crear una plantilla nueva.
- Propuestas de Mejora: Usa 'SOPORTE_MEJORA_PROMPT' antes de enviar borradores.
- Éxito Operativo: Usa 'SOPORTE_OPERACION_EXITOSA' para cierres técnicos.

REGLAS DE ORO:
- Actúa con autoridad técnica.
- Transparencia en las fases del Kernel.
- Proactividad.
- Determinismo: Prefiere plantillas sobre texto libre.
- DETERMINISMO DE SLOTS: No inventes campos (slots). Utiliza exclusivamente los definidos en la morfología de la herramienta. Si necesitas incluir datos adicionales (como precios) que no tienen un slot específico, inclúyelos dentro del campo de texto descriptivo (ej: 'content' o 'improvements').

TONO:
Profesional, altamente eficiente, resolutivo y profundamente técnico.`;

        await db.update(accounts)
            .set({ privateContext: newPrivateContext })
            .where(eq(accounts.id, ACCOUNT_ID));

        console.log('✅ Sistema de gestión de plantillas completado.');

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

fixSovereignty();
