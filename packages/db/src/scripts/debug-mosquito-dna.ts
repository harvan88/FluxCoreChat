
import { pipeline } from '@xenova/transformers';

async function main() {
    const text = "### Mosquito del dengue (Aedes aegypti)";
    const modelName = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
    
    console.log(`--- DEBUG MOSQUITO DNA: "${text}" ---`);

    const pipe = await pipeline('feature-extraction', modelName);
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    const vec = output.tolist()[0];
    
    console.log(`Vector Mosquito (Primeros 5): ${vec.slice(0, 5).join(', ')}`);

    process.exit(0);
}

main().catch(console.error);
