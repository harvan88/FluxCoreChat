
import * as path from 'path';
import { pathToFileURL } from 'url';

async function testLoad() {
    // Correct absolute path resolving
    const extPath = path.resolve(__dirname, '../../../../extensions/fluxcore-asistentes/src/index.ts');
    const extUrl = pathToFileURL(extPath).href;

    console.log('Intentando cargar Path:', extPath);
    console.log('Intentando cargar URL:', extUrl);

    try {
        const mod = await import(extUrl);
        console.log('✅ Módulo cargado correctamente');
        console.log('Exports:', Object.keys(mod));

        if (typeof mod.getFluxCore === 'function') {
            console.log('✅ getFluxCore encontrado');
        } else {
            console.log('❌ getFluxCore NO encontrado');
            if (mod.default) console.log('Default export:', mod.default);
        }

    } catch (err: any) {
        console.error('❌ Error cargando módulo:', err);
    }
}

testLoad();
