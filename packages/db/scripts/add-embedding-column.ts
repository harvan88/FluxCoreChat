/**
 * Script para agregar la columna embedding a fluxcore_document_chunks
 * Ejecutar con: bun run packages/db/scripts/add-embedding-column.ts
 */

import { db } from '../src/index';
import { sql } from 'drizzle-orm';

async function addEmbeddingColumn() {
    console.log('Agregando columna embedding a fluxcore_document_chunks...');

    try {
        // Crear extensión vector si no existe
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
        console.log('✓ Extension vector verificada');

        // Agregar columna embedding
        await db.execute(sql`
      ALTER TABLE fluxcore_document_chunks 
      ADD COLUMN IF NOT EXISTS embedding vector(1536)
    `);
        console.log('✓ Columna embedding agregada');

        // Crear índice HNSW
        await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_fluxcore_document_chunks_embedding 
      ON fluxcore_document_chunks 
      USING hnsw (embedding vector_cosine_ops)
    `);
        console.log('✓ Índice HNSW creado');

        console.log('\n✅ Migración completada exitosamente');
    } catch (error: any) {
        console.error('Error:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

addEmbeddingColumn();
