import fs from 'fs';
import path from 'path';

// Mini-implementación de la lógica para no lidiar con imports complejos del monorepo en un script rápido
function countTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

interface Chunk {
    content: string;
    index: number;
    tokenCount: number;
}

function verifyChunking(text: string, regexStr: string): Chunk[] {
    console.log(`\nProbando con Regex: "${regexStr}"`);
    // El frontend enviará el string literal. En JS para RegExp necesitamos manejarlo.
    // Si el usuario escribe \n---\n en la UI, llega como "\\n---\\n" si no se escapa bien.
    // Pero asumiendo que llega el carácter real de escape o el patrón:
    const regex = new RegExp(regexStr, 'g');
    const parts = text.split(regex);
    
    return parts
        .map((content, index) => ({
            content: content.trim(),
            index,
            tokenCount: countTokens(content),
        }))
        .filter(c => c.content.length > 0);
}

async function main() {
    const filePath = path.join('docs', 'reconstruction-phase-1', 'temp', 'Catálogo.md');
    const text = fs.readFileSync(filePath, 'utf-8');

    console.log("=== TEST DE VERIFICACIÓN DE CHUNKING PERSONALIZADO ===");
    console.log(`Archivo: ${filePath} (${text.length} caracteres)`);

    // Prueba 1: El delimitador que definimos
    const chunks = verifyChunking(text, '\\n---\\n');

    console.log(`\nResultados:`);
    console.log(`Total Chunks encontrados: ${chunks.length}`);

    if (chunks.length > 1) {
        console.log("\n--- PRIMER CHUNK ---");
        console.log(chunks[0].content);
        console.log("--------------------");
        
        console.log("\n--- SEGUNDO CHUNK ---");
        console.log(chunks[1].content);
        console.log("--------------------");

        console.log("\n--- ÚLTIMO CHUNK ---");
        console.log(chunks[chunks.length - 1].content);
        console.log("--------------------");
        
        console.log("\n✅ VERIFICACIÓN EXITOSA: El delimitador '---' separa los bloques correctamente.");
    } else {
        console.log("\n❌ ERROR: No se separaron los bloques. El regex no hizo match.");
        
        // Intento con un regex más flexible por si hay espacios
        console.log("\nReintento con regex flexible: \\n\\s*---\\s*\\n");
        const chunks2 = verifyChunking(text, '\\n\\s*---\\s*\\n');
        console.log(`Total Chunks: ${chunks2.length}`);
        if (chunks2.length > 1) {
            console.log("✅ EL REGEX FLEXIBLE FUNCIONÓ.");
        }
    }
}

main().catch(console.error);
