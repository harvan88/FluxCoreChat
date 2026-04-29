import { db } from './src/index';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  console.log('Aplicando Sovereign Shield v2...');
  try {
    const sqlContent = fs.readFileSync(path.join(__dirname, 'migrations', '053_sovereign_shield_v2.sql'), 'utf-8');
    await db.execute(sql.raw(sqlContent));
    console.log('✅ Migración aplicada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    process.exit(1);
  }
}

applyMigration();
