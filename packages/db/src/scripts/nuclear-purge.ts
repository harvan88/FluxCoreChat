
import { db } from '../index';
import { assets, fluxcoreDocumentChunks, fluxcoreVectorStoreFiles, fluxcoreFiles } from '../schema';
import { sql } from 'drizzle-orm';

async function nuclearPurge() {
    console.log('☢️ INICIANDO PURGA NUCLEAR DE DATOS RAG ☢️');
    console.log('Este proceso es irreversible y borrará TODO el contenido de la base de conocimiento...');

    try {
        // Desactivar triggers temporalmente si fuera necesario (opcional)
        // Pero el CASCADE debería encargarse de lo básico.
        
        console.log('🧹 Limpiando fragmentos vectoriales...');
        await db.delete(fluxcoreDocumentChunks);
        
        console.log('🔗 Limpiando vínculos de vector stores...');
        await db.delete(fluxcoreVectorStoreFiles);
        
        console.log('📦 Limpiando tabla maestra de assets...');
        await db.delete(assets);
        
        console.log('📄 Limpiando tabla de archivos legacy...');
        await db.delete(fluxcoreFiles);

        console.log('✨ SISTEMA SANEADO. Tu base de datos está vacía y lista para nuevas ingestas.');
    } catch (err) {
        console.error('❌ FALLO DURANTE LA PURGA:', err);
    }

    process.exit(0);
}

nuclearPurge().catch(console.error);
