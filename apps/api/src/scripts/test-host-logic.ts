
import * as path from 'path';
import { pathToFileURL } from 'url';

async function testExactLogic() {
    console.log('=== PRUEBA DE CARGA EXACTA ===');

    // 1. Simular lo que haría manifestLoader
    const root = path.resolve(__dirname, '../../../../extensions/fluxcore-asistentes');
    const entrypoint = './src/index.ts'; // Valor literal del manifest.json

    console.log('Root:', root);
    console.log('Entrypoint:', entrypoint);

    // 2. Lógica de ExtensionHost
    const absEntrypoint = path.resolve(root, entrypoint);
    console.log('Abs Entrypoint:', absEntrypoint);

    const moduleUrl = pathToFileURL(absEntrypoint).href;
    console.log('Module URL:', moduleUrl);

    try {
        console.log('Importing...');
        const mod = await import(moduleUrl);
        console.log('✅ ÉXITO!');
        console.log('Default export:', mod.default ? 'YES' : 'NO');
        console.log('Named exports:', Object.keys(mod));

        // Probar instanciación si es posible
        if (mod.FluxCoreExtension) {
            console.log('Instanciando FluxCoreExtension...');
            const instance = new mod.FluxCoreExtension();
            console.log('Instancia creada:', instance);
        }
    } catch (err: any) {
        console.error('❌ FALLÓ EL IMPORT:', err);
        // console.error('Stack:', err.stack); // Stack suele ser inútil en dynamic import errors
    }
}

testExactLogic();
