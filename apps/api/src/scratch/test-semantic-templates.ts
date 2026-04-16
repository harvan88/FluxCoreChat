import { embeddingService } from '../services/embedding.service';

/**
 * Experimento de Selección Semántica de Plantillas
 * Objetivos:
 * 1. Probar si el modelo local localiza bien intenciones simples.
 * 2. Verificar umbrales de similitud.
 */

const mockTemplates = [
    { id: 'T1', name: 'Saludo Inicial', instructions: 'Se usa al inicio, cuando el usuario envía un saludo como Hola o Quiero info.' },
    { id: 'T5', name: 'Solicitud de Especie', instructions: 'Se activa cuando se menciona una plaga genérica como cucarachas pero falta la especie.' },
    { id: 'T6', name: 'Solicitud de Barrio', instructions: 'Se activa si conocemos la plaga pero no el barrio del usuario.' },
    { id: 'T9', name: 'Tratamiento de Plaga', instructions: 'Se activa cuando la especie está identificada y el barrio validado para dar precio.' },
    { id: 'T3', name: 'Derivación por Imagen', instructions: 'Se activa exclusivamente si el usuario envía imágenes para identificación técnica.' }
];

async function runTest() {
    console.log('--- TEST DE SIMILITUD SEMÁNTICA DE PLANTILLAS ---');

    // 1. Pre-generar embeddings de plantillas (Esto se haría una sola vez)
    console.log('Generando embeddings de referencia (usando local)...');
    const templateEmbeddings = await Promise.all(
        mockTemplates.map(async t => ({
            id: t.id,
            embedding: (await embeddingService.embedWithConfig(t.instructions, { provider: 'local', model: 'paraphrase-multilingual-MiniLM-L12-v2', dimensions: 384 })).embedding
        }))
    );

    const testQueries = [
        'Hola buenas tardes',
        'tengo cucarachas en la cocina',
        'soy de barrio alberdi',
        'te mando una foto',
        'ya te dije' // El caso PROBLEMÁTICO
    ];

    for (const query of testQueries) {
        console.log(`\n🔍 Query: "${query}"`);
        
        const queryEmb = (await embeddingService.embedWithConfig(query, { provider: 'local', model: 'paraphrase-multilingual-MiniLM-L12-v2', dimensions: 384 })).embedding;

        const results = templateEmbeddings.map(te => ({
            id: te.id,
            score: embeddingService.cosineSimilarity(queryEmb, te.embedding)
        })).sort((a, b) => b.score - a.score);

        results.slice(0, 3).forEach(r => {
            const t = mockTemplates.find(mt => mt.id === r.id);
            console.log(`  [${r.score.toFixed(4)}] -> ${t?.name}`);
        });
    }
}

runTest().catch(console.error);
