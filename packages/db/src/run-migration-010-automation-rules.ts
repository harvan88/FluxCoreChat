/**
 * Migración 010: Crear tabla automation_rules
 * COR-007: Automation Controller
 * 
 * Ejecutar: bun run packages/db/src/run-migration-010-automation-rules.ts
 */

import { db } from './index';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('🚀 Ejecutando migración 010: automation_rules...');

  try {
    // Crear tabla automation_rules
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS automation_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
        mode VARCHAR(20) NOT NULL DEFAULT 'supervised',
        enabled BOOLEAN NOT NULL DEFAULT true,
        config JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ Tabla automation_rules creada');

    // Crear índice único para account + relationship (permite null en relationship)
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_rules_account_relationship 
      ON automation_rules (account_id, COALESCE(relationship_id, '00000000-0000-0000-0000-000000000000'))
    `);
    console.log('✅ Índice único creado');

    // Crear índice para búsquedas por account
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_automation_rules_account 
      ON automation_rules (account_id)
    `);
    console.log('✅ Índice por account creado');

    // Crear índice para búsquedas por relationship
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_automation_rules_relationship 
      ON automation_rules (relationship_id) 
      WHERE relationship_id IS NOT NULL
    `);
    console.log('✅ Índice por relationship creado');

    console.log('');
    console.log('✅ Migración 010 completada exitosamente');

  } catch (error: any) {
    console.error('❌ Error en migración:', error.message);
    throw error;
  }

  process.exit(0);
}

runMigration();
