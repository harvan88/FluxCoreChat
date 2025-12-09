/**
 * AUDIT DATABASE SCRIPT
 * Ejecuta este script para ver el estado REAL de PostgreSQL
 * 
 * Uso: 
 *   bun run packages/db/src/audit-database.ts
 *   bun run packages/db/src/audit-database.ts --json > db-state.json
 * 
 * FC-513: Expandido con export JSON y comparación con schemas
 */

import postgres from 'postgres';
import { writeFileSync } from 'fs';
import { join } from 'path';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/fluxcore';
const sql = postgres(connectionString);

async function auditDatabase() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('       AUDITORÍA DE BASE DE DATOS POSTGRESQL - ESTADO REAL');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // ==========================================
    // 1. LISTAR TODAS LAS TABLAS
    // ==========================================
    console.log('📋 PARTE 1: TABLAS EXISTENTES EN LA BASE DE DATOS\n');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log('Tablas encontradas:', tables.length);
    console.log('─────────────────────────────────────────────────');
    tables.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.table_name}`);
    });
    console.log('');

    // ==========================================
    // 2. DETALLE DE CADA TABLA
    // ==========================================
    console.log('\n📋 PARTE 2: ESTRUCTURA DE CADA TABLA\n');

    for (const table of tables) {
      console.log(`\n┌─────────────────────────────────────────────────`);
      console.log(`│ TABLA: ${table.table_name}`);
      console.log(`└─────────────────────────────────────────────────`);

      // Columnas
      const columns = await sql`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = ${table.table_name}
        ORDER BY ordinal_position
      `;

      console.log('\n  Columnas:');
      console.log('  ─────────────────────────────────────────────────');
      for (const col of columns) {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const def = col.column_default ? ` DEFAULT ${col.column_default.substring(0, 30)}...` : '';
        console.log(`    • ${col.column_name}: ${col.data_type}${length} ${nullable}${def}`);
      }

      // Foreign Keys
      const fks = await sql`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = ${table.table_name}
      `;

      if (fks.length > 0) {
        console.log('\n  Foreign Keys:');
        console.log('  ─────────────────────────────────────────────────');
        for (const fk of fks) {
          console.log(`    • ${fk.column_name} → ${fk.foreign_table_name}(${fk.foreign_column_name})`);
        }
      }

      // Índices
      const indexes = await sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = ${table.table_name}
        AND schemaname = 'public'
      `;

      if (indexes.length > 0) {
        console.log('\n  Índices:');
        console.log('  ─────────────────────────────────────────────────');
        for (const idx of indexes) {
          console.log(`    • ${idx.indexname}`);
        }
      }

      // Contar registros
      const countResult = await sql.unsafe(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
      console.log(`\n  Registros: ${countResult[0].count}`);
    }

    // ==========================================
    // 3. COMPARACIÓN CON SCHEMAS ESPERADOS
    // ==========================================
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('       PARTE 3: VERIFICACIÓN DE CAMPOS CRÍTICOS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const checks = [
      { table: 'accounts', column: 'owner_user_id', desc: 'FK a users (Drizzle)' },
      { table: 'accounts', column: 'user_id', desc: 'FK a users (migrate-all)' },
      { table: 'accounts', column: 'profile', desc: 'JSONB perfil' },
      { table: 'accounts', column: 'alias', desc: 'Alias (migration-009)' },
      { table: 'actors', column: 'actor_type', desc: 'Tipo actor (migration-008)' },
      { table: 'actors', column: 'extension_id', desc: 'Extension ID (migration-008)' },
      { table: 'messages', column: 'status', desc: 'Status sync (migration-007)' },
      { table: 'messages', column: 'from_actor_id', desc: 'Actor origen (migration-008)' },
      { table: 'messages', column: 'to_actor_id', desc: 'Actor destino (migration-008)' },
      { table: 'messages', column: 'generated_by', desc: 'Generado por (Drizzle)' },
      { table: 'messages', column: 'metadata', desc: 'Metadata (migrate-all)' },
      { table: 'relationships', column: 'perspective_a', desc: 'Perspectiva A (Drizzle)' },
      { table: 'relationships', column: 'perspective_b', desc: 'Perspectiva B (Drizzle)' },
      { table: 'relationships', column: 'status', desc: 'Status (migrate-all)' },
      { table: 'conversations', column: 'status', desc: 'Status (Drizzle)' },
      { table: 'conversations', column: 'metadata', desc: 'Metadata (migrate-all)' },
      { table: 'conversations', column: 'last_message_at', desc: 'Last message (Drizzle)' },
    ];

    const tableList = tables.map(t => t.table_name);

    for (const check of checks) {
      if (!tableList.includes(check.table)) {
        console.log(`❌ ${check.table}.${check.column} - TABLA NO EXISTE`);
        continue;
      }

      const exists = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${check.table} 
        AND column_name = ${check.column}
      `;

      if (exists.length > 0) {
        console.log(`✅ ${check.table}.${check.column} - ${check.desc}`);
      } else {
        console.log(`❌ ${check.table}.${check.column} - NO EXISTE - ${check.desc}`);
      }
    }

    // ==========================================
    // 4. TABLAS ESPERADAS VS REALES
    // ==========================================
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('       PARTE 4: TABLAS ESPERADAS VS REALES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const expectedTables = [
      // Drizzle journal confirmadas
      { name: 'users', source: 'Drizzle 0000' },
      { name: 'accounts', source: 'Drizzle 0000' },
      { name: 'actors', source: 'Drizzle 0000' },
      { name: 'relationships', source: 'Drizzle 0001' },
      { name: 'conversations', source: 'Drizzle 0001' },
      { name: 'messages', source: 'Drizzle 0001' },
      { name: 'message_enrichments', source: 'Drizzle 0001' },
      // Scripts manuales
      { name: 'automation_rules', source: 'migration-010' },
      { name: 'extension_installations', source: 'migrate-extensions' },
      { name: 'extension_contexts', source: 'migrate-extensions' },
      { name: 'workspaces', source: 'migrate-workspaces' },
      { name: 'workspace_members', source: 'migrate-workspaces' },
      { name: 'workspace_invitations', source: 'migrate-workspaces' },
      // migrate-all.ts (puede conflictuar)
      { name: 'extensions', source: 'migrate-all (conflicto!)' },
      { name: 'appointment_services', source: 'migrate-all' },
      { name: 'appointment_staff', source: 'migrate-all' },
      { name: 'appointments', source: 'migrate-all' },
    ];

    console.log('Verificando tablas esperadas:\n');
    for (const expected of expectedTables) {
      if (tableList.includes(expected.name)) {
        console.log(`✅ ${expected.name} - EXISTE (${expected.source})`);
      } else {
        console.log(`❌ ${expected.name} - NO EXISTE (${expected.source})`);
      }
    }

    // Tablas inesperadas
    const expectedNames = expectedTables.map(t => t.name);
    const unexpected = tableList.filter(t => !expectedNames.includes(t));
    
    if (unexpected.length > 0) {
      console.log('\n⚠️ Tablas NO esperadas encontradas:');
      unexpected.forEach(t => console.log(`   • ${t}`));
    }

    // ==========================================
    // 5. RESUMEN FINAL
    // ==========================================
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('       RESUMEN FINAL');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`Total tablas en DB: ${tables.length}`);
    console.log(`Total tablas esperadas: ${expectedTables.length}`);
    
    const existingExpected = expectedTables.filter(t => tableList.includes(t.name));
    const missingExpected = expectedTables.filter(t => !tableList.includes(t.name));
    
    console.log(`Tablas esperadas existentes: ${existingExpected.length}`);
    console.log(`Tablas esperadas faltantes: ${missingExpected.length}`);
    console.log(`Tablas inesperadas: ${unexpected.length}`);

    if (missingExpected.length > 0) {
      console.log('\n⚠️ ACCIÓN REQUERIDA: Ejecutar migraciones faltantes:');
      missingExpected.forEach(t => {
        console.log(`   • ${t.name} → ${t.source}`);
      });
    }

    // ==========================================
    // 6. FC-513: EXPORT JSON (opcional)
    // ==========================================
    if (process.argv.includes('--json')) {
      const dbState = {
        timestamp: new Date().toISOString(),
        tables: await Promise.all(tables.map(async (table) => {
          const columns = await sql`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = ${table.table_name}
            ORDER BY ordinal_position
          `;
          
          return {
            name: table.table_name,
            columns: columns.map(c => ({
              name: c.column_name,
              type: c.data_type,
              nullable: c.is_nullable === 'YES',
              default: c.column_default,
            })),
          };
        })),
      };
      
      const outputPath = join(process.cwd(), 'db-state.json');
      writeFileSync(outputPath, JSON.stringify(dbState, null, 2));
      console.log(`\n📄 Estado exportado a: ${outputPath}`);
    }

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nVerifica que:');
    console.error('  1. PostgreSQL está corriendo');
    console.error('  2. DATABASE_URL está configurado correctamente');
    console.error('  3. La base de datos "fluxcore" existe');
  } finally {
    await sql.end();
  }
}

auditDatabase();
