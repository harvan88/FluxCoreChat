
import * as path from 'path';
import { pathToFileURL } from 'url';

async function testLoad() {
    const extPath = path.resolve(process.cwd(), '../../../extensions/fluxcore-asistentes/src/index.ts');
    console.log('Intentando cargar:', extPath);

    try {
        const mod = await import(extPath);
        console.log('✅ Módulo cargado correctamente');
        console.log('Exports:', Object.keys(mod));

        if (typeof mod.getFluxCore === 'function') {
            console.log('✅ getFluxCore encontrado');
            const instance = mod.getFluxCore();
            console.log('Instance:', instance);
        } else {
            console.log('❌ getFluxCore NO encontrado');
            // Revisar si exporta la clase directamente o default
            if (mod.default) console.log('Default export:', mod.default);
        }

    } catch (err: any) {
        console.error('❌ Error cargando módulo:', err);
        console.error('Stack:', err.stack);
    }
}

testLoad();
