
import { manifestLoader } from '../services/manifest-loader.service';
import * as path from 'path';
import * as fs from 'fs';

async function diagnose() {
    console.log('--- DIAGNÓSTICO DE EXTENSIONES ---');

    // 1. Simular carga manual para ver qué pasa
    const extensionsDir = path.resolve(__dirname, '../../../../extensions');
    console.log('Directorio de extensiones:', extensionsDir);

    if (fs.existsSync(extensionsDir)) {
        const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const extPath = path.join(extensionsDir, entry.name);
                console.log(`\nProbando carga de: ${entry.name}`);
                const m = await manifestLoader.loadFromDirectory(extPath);
                if (m) {
                    console.log(`✅ MANIFEST OK: ${m.id}`);
                    console.log(`   Entrypoint: ${m.entrypoint}`);

                    // Intentar resolver entrypoint absoluto
                    const root = manifestLoader.getExtensionRoot(m.id);
                    if (root) {
                        const absEntry = path.resolve(root, m.entrypoint as string);
                        console.log(`   Abs Entrypoint: ${absEntry}`);
                        console.log(`   Existe archivo?: ${fs.existsSync(absEntry)}`);
                    } else {
                        console.log('   ❌ Root no registrado!');
                    }

                } else {
                    console.log('❌ FALLÓ carga de manifest');
                }
            }
        }
    } else {
        console.log('❌ Directorio extensions no existe!');
    }
}

diagnose();
