
import { pipeline } from '@xenova/transformers';

async function main() {
    const text = "Modelado 360";
    const modelName = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
    
    console.log(`--- DEBUG MODEL OUTPUT: "${text}" ---`);

    const pipe = await pipeline('feature-extraction', modelName);

    // 1. Con pooling y normalize auto
    const outputAuto = await pipe(text, { pooling: 'mean', normalize: true });
    const vecAuto = outputAuto.tolist()[0];
    console.log(`Auto (Primeros 5): ${vecAuto.slice(0, 5).join(', ')}`);

    // 2. RAW (sin nada)
    const outputRaw = await pipe(text);
    // outputRaw es [batch, seq, dim]
    const vecRaw = outputRaw.tolist()[0][0]; // El primer token (CLS o similar)
    console.log(`Raw (CLS token) (Primeros 5): ${vecRaw.slice(0, 5).join(', ')}`);

    // 3. Manual Mean Pooling
    const tensorData = outputRaw.tolist()[0]; // [seq, dim]
    const dim = tensorData[0].length;
    const seq = tensorData.length;
    const manualMean = new Array(dim).fill(0);
    
    for (let i = 0; i < seq; i++) {
        for (let j = 0; j < dim; j++) {
            manualMean[j] += tensorData[i][j];
        }
    }
    for (let j = 0; j < dim; j++) manualMean[j] /= seq;
    
    console.log(`Manual Mean (Primeros 5): ${manualMean.slice(0, 5).join(', ')}`);

    process.exit(0);
}

main().catch(console.error);
