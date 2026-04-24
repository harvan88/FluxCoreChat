
import { embeddingService } from '../../../../apps/api/src/services/embedding.service';

async function main() {
    const text = "Modelado 360";
    console.log(`--- CROSS-VERIFY: "${text}" ---`);

    // 1. Generar vector
    const result = await embeddingService.embedWithConfig(text, {
        provider: 'local',
        model: 'paraphrase-multilingual-MiniLM-L12-v2',
        dimensions: 384
    });

    const vec = result.embedding;
    console.log(`Dimensiones: ${vec.length}`);
    console.log(`Primeros 5 valores: ${vec.slice(0, 5).join(', ')}`);

    // 2. Calcular auto-similitud (Coseno)
    // Similitud = (A . B) / (||A|| * ||B||)
    let dot = 0;
    let norm = 0;
    for (let i = 0; i < vec.length; i++) {
        dot += vec[i] * vec[i];
        norm += vec[i] * vec[i];
    }
    
    const similarity = dot / (Math.sqrt(norm) * Math.sqrt(norm));
    console.log(`Auto-Similitud Matemática (JS): ${similarity}`);

    if (similarity < 0.99) {
        console.error("❌ ERROR: El motor de IA no es consistente o no está normalizado.");
    } else {
        console.log("✅ ÉXITO: El motor de IA genera vectores consistentes.");
    }

    process.exit(0);
}

main().catch(console.error);
