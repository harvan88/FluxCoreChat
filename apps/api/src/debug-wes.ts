
import { db, fluxcoreWorkDefinitions } from '@fluxcore/db';

async function debugWES() {
  console.log('🔍 Auditando WorkDefinitions en la DB...');
  try {
    const defs = await db.select().from(fluxcoreWorkDefinitions);
    console.log('--------------------------------------------------');
    console.log(`Encontradas ${defs.length} definiciones:`);
    defs.forEach(d => {
      console.log(`- ID: ${d.id}`);
      console.log(`  Nombre: ${d.name}`);
      console.log(`  Cuenta: ${d.accountId}`);
      console.log('--------------------------------------------------');
    });
  } catch (err: any) {
    console.error('❌ Error al consultar la DB:', err.message);
  }
}

debugWES().then(() => process.exit(0));
