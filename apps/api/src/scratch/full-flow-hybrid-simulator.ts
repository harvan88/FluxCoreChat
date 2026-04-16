import { embeddingService } from '../services/embedding.service';
import { llmClient } from '../services/fluxcore/llm-client.service';
import * as Prompts from '../services/fluxcore/runtimes/asistentes-local.prompts';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SIMULADOR DE FLUJO COMPLETO HÍBRIDO (Ragno Edition)
 * Este script simula una conversación real paso a paso para verificar el ahorro de tokens y precisión.
 */

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runSimulation() {
    console.log('\n==================================================================');
    console.log('🚀 SIMULACIÓN DE FLUJO HÍBRIDO (Semántica + Keywords + LLM)');
    console.log('==================================================================\n');

    // 1. Cargar Blueprints
    const blueprintPath = path.join(process.cwd(), 'ragno-blueprint-templates.json');
    const blueprints = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));
    
    // Mapear a formato interno para el test
    const templates = blueprints.map((b: any, index: number) => ({
        id: `T${index + 1}`,
        name: b.name,
        instructions: b.aiSettings.aiUsageInstructions,
        content: b.content,
        keywords: b.tags
    }));

    console.log(`📦 Se han cargado ${templates.length} plantillas del blueprint.`);

    // 2. Generar Embeddings de referencia (Cache inicial)
    console.log('🧠 Generando índices semánticos locales (MiniLM)...');
    const templateEmbeddings = await Promise.all(templates.map(async t => {
        const result = await embeddingService.embedWithConfig(t.instructions, {
            provider: 'local',
            model: 'paraphrase-multilingual-MiniLM-L12-v2',
            dimensions: 384
        });
        return { id: t.id, embedding: result.embedding };
    }));

    // 3. Definir Conversación
    const conversation = [
        { turn: 1, user: 'Hola' },
        { turn: 2, user: 'Tengo cucarachas en la casa' },
        { turn: 3, user: 'Son pequeñas y amarillas' }
    ];

    let history: string[] = [];

    for (const step of conversation) {
        console.log(`\n---------------------------------------------------------`);
        console.log(`💬 TURNO ${step.turn}: "${step.user}"`);
        console.log(`---------------------------------------------------------`);

        // A. Búsqueda por Palabras Clave
        const keywordMatches = templates
            .filter(t => t.keywords.some((k: string) => step.user.toLowerCase().includes(k.toLowerCase())))
            .map(t => t.id);

        // B. Búsqueda Semántica (Top 5)
        const queryResult = await embeddingService.embedWithConfig(step.user, {
            provider: 'local',
            model: 'paraphrase-multilingual-MiniLM-L12-v2',
            dimensions: 384
        });
        
        const semanticScores = templateEmbeddings.map(te => ({
            id: te.id,
            score: embeddingService.cosineSimilarity(queryResult.embedding, te.embedding)
        })).sort((a, b) => b.score - a.score);

        const topSemanticIds = semanticScores.slice(0, 5).map(s => s.id);

        // C. Unión y Filtrado
        const finalCandidateIds = new Set([...keywordMatches, ...topSemanticIds]);
        const filteredTemplates = templates.filter(t => finalCandidateIds.has(t.id));

        console.log(`🔍 Filtro Híbrido seleccionó ${filteredTemplates.length} candidatas (Top: ${filteredTemplates[0].name})`);
        console.log(`📊 Ahorro estimado de tokens en prompt: ${Math.round((1 - (filteredTemplates.length / templates.length)) * 100)}%`);

        // D. Llamada a la IA (Router)
        const templatesPromptSegment = filteredTemplates.map(t => `- ID: ${t.id} (${t.name})\n  Instrucción: ${t.instructions}`).join('\n\n');
        const systemPrompt = Prompts.buildRouterSystemPrompt(templatesPromptSegment);

        history.push(`USER: ${step.user}`);

        try {
            const result = await llmClient.complete({
                provider: 'groq',
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `HISTORIAL:\n${history.join('\n')}` }
                ],
                responseFormat: { type: 'json_object' }
            });

            console.log(`🤖 RESULTADO ROUTER: ${result.content}`);
            history.push(`ASSISTANT: ${result.content}`);
        } catch (error: any) {
            console.error(`❌ Error en llamada a IA: ${error.message}`);
        }

        await sleep(2000); // Pausa para evitar rate limits en el test
    }

    console.log('\n✅ Simulación completada.');
}

runSimulation().catch(console.error);
