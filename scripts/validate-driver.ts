
import { OpenAIDriver } from '../apps/api/src/services/drivers/openai.driver';

async function main() {
    console.log('🚀 Iniciando Validación de OpenAIDriver...');

    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY no encontrada en entorno.');
        process.exit(1);
    }

    // 1. Instanciar Driver
    const driver = new OpenAIDriver(process.env.OPENAI_API_KEY);
    console.log('✅ Driver instanciado.');

    // 2. Crear Store
    const storeName = `Driver Test ${Date.now()}`;
    console.log(`📦 Creando Store: ${storeName}...`);
    const storeId = await driver.createStore(storeName, { test: 'true' });
    console.log(`✅ Store creado. ID: ${storeId}`);

    try {
        // 3. Subir Archivo
        const buffer = Buffer.from('Hola mundo, este es un archivo de prueba para el vector store driver.', 'utf-8');
        console.log('📄 Subiendo archivo de prueba...');
        const file = await driver.uploadFile(storeId, buffer, 'test_driver.txt', 'text/plain');
        console.log(`✅ Archivo subido. ID: ${file.id} | Status: ${file.status}`);

        // 4. Listar Archivos
        console.log('📋 Listando archivos...');
        // Esperar un momento por consistencia eventual de OpenAI
        await new Promise(r => setTimeout(r, 2000));
        const files = await driver.listFiles(storeId);
        console.log(`   Encontrados: ${files.length}`);
        if (files.some(f => f.id === file.id)) {
            console.log('✅ El archivo subido aparece en la lista.');
        } else {
            console.warn('⚠️ El archivo subido NO aparece en la lista (posible latencia).');
        }

        // 5. Borrar Archivo
        console.log(`🗑️ Borrando archivo ${file.id}...`);
        await driver.deleteFile(storeId, file.id);
        console.log('✅ Archivo borrado (desvinculado y eliminado).');

    } catch (err) {
        console.error('❌ Error en flujo de archivos:', err);
    } finally {
        // 6. Borrar Store (Cleanup)
        console.log(`🔥 Eliminando Store ${storeId}...`);
        await driver.deleteStore(storeId);
        console.log('✅ Store eliminado.');
    }
    process.exit(0);
}

main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
