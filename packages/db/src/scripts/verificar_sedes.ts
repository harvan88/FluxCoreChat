import { db, pool } from '../connection';
import { accountLocations } from '../schema/locations';
import { desc, eq } from 'drizzle-orm';

async function main() {
  const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // ID de Dr. Jones
  console.log(`\n====================================================`);
  console.log(`   AUDITORÍA DE BASE DE DATOS - SEDES (DR. JONES)   `);
  console.log(`====================================================\n`);

  try {
    const results = await db.select().from(accountLocations)
      .where(eq(accountLocations.accountId, accountId))
      .orderBy(desc(accountLocations.createdAt))
      .limit(5);

    if (results.length === 0) {
      console.log('❌ No se encontraron sedes para esta cuenta.');
    } else {
      results.forEach((loc, i) => {
        console.log(`📍 [REGISTRO #${i + 1}]`);
        console.log(`   ID: ${loc.id}`);
        console.log(`   NOMBRE: ${loc.name}`);
        console.log(`   DIRECCIÓN (address): "${loc.address}"`);
        console.log(`   CALLE Y ALTURA (streetAddress): "${loc.streetAddress}"`);
        console.log(`   CIUDAD: ${loc.city}`);
        console.log(`   COORDENADAS: Lat ${loc.lat}, Lon ${loc.lon}`);
        console.log(`   FECHA CREACIÓN: ${loc.createdAt}`);
        console.log(`----------------------------------------------------\n`);
      });
    }
  } catch (error) {
    console.error('Error leyendo la base de datos:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
