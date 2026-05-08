import { db, pool } from '../connection';
import { accountLocations } from '../schema/locations';
import { eq, desc } from 'drizzle-orm';
import fs from 'fs';

async function main() {
  const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // Dr. Jones
  const report: string[] = [];
  report.push(`# AUDITORÍA TOTAL DE BASE DE DATOS - SEDES\n`);
  report.push(`Fecha: ${new Date().toLocaleString()}\n`);
  report.push(`Este documento muestra TODOS los campos reales persistidos en la tabla 'account_locations'.\n`);

  try {
    const results = await db.select().from(accountLocations)
      .where(eq(accountLocations.accountId, accountId))
      .orderBy(desc(accountLocations.createdAt))
      .limit(3);

    if (results.length === 0) {
      report.push(`❌ No se encontraron registros.`);
    } else {
      results.forEach((loc, i) => {
        report.push(`### REGISTRO #${i + 1}: ${loc.name}`);
        report.push(`| Campo | Valor |`);
        report.push(`| :--- | :--- |`);
        report.push(`| **id** | ${loc.id} |`);
        report.push(`| **name** | ${loc.name} |`);
        report.push(`| **address (Visible)** | "${loc.address}" |`);
        report.push(`| **street_address (Técnico)** | "${loc.streetAddress}" |`);
        report.push(`| **city** | ${loc.city || 'NULL'} |`);
        report.push(`| **neighborhood** | ${loc.neighborhood || 'NULL'} |`);
        report.push(`| **state** | ${loc.state || 'NULL'} |`);
        report.push(`| **country** | ${loc.country || 'NULL'} |`);
        report.push(`| **postalCode** | ${loc.postalCode || 'NULL'} |`);
        report.push(`| **lat** | ${loc.lat} |`);
        report.push(`| **lon** | ${loc.lon} |`);
        report.push(`| **phone** | ${loc.phone || 'NULL'} |`);
        report.push(`| **email** | ${loc.email || 'NULL'} |`);
        report.push(`| **timezone** | ${loc.timezone || 'NULL'} |`);
        report.push(`| **status** | ${loc.status} |`);
        report.push(`| **isDefault** | ${loc.isDefault} |`);
        report.push(`| **serviceType** | ${loc.serviceType} |`);
        report.push(`| **metadata** | ${JSON.stringify(loc.metadata)} |`);
        report.push(`| **createdAt** | ${loc.createdAt} |`);
        report.push(`\n---\n`);
      });
    }
  } catch (error) {
    report.push(`\n❌ ERROR EN AUDITORÍA: ${error}\n`);
  }

  const filePath = 'auditoria_total_db.md';
  fs.writeFileSync(filePath, report.join('\n'));
  console.log(`\n✅ Auditoría completa generada en: ${filePath}\n`);
  
  await pool.end();
}

main().catch(console.error);
