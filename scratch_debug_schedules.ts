
import { db, accountLocations, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { scheduleService } from './apps/api/src/services/schedule.service';
import { DateTime } from 'luxon';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // Dr. Jones
    const reportPath = path.resolve(process.cwd(), 'docs/reconstruction-phase-1/temp/reporte_resolutor_horarios.md');
    
    console.log(`🚀 Iniciando Laboratorio de Soberanía Física para cuenta: ${accountId}`);
    
    // 1. Obtener sedes
    const locations = await db.select().from(accountLocations).where(eq(accountLocations.accountId, accountId));
    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    
    let report = `# 🔬 Reporte de Soberanía Física: Resolutor de Horarios\n\n`;
    report += `**Cuenta:** ${account.displayName} (${accountId})\n`;
    report += `**Timezone de la cuenta en DB:** ${account.timezone || 'NOT SET (Defaulting to UTC)'}\n`;
    report += `**Hora actual del Servidor (UTC):** ${DateTime.now().toFormat('HH:mm:ss')}\n\n`;
    
    report += `## 📍 Análisis por Sede\n\n`;
    
    for (const loc of locations) {
        report += `### Sede: ${loc.name} (${loc.id})\n`;
        report += `- **Dirección:** ${loc.address}\n`;
        report += `- **Estado Manual:** ${loc.status}\n`;
        
        // Probar diferentes horas
        const scenarios = [
            { name: "Realidad User (17:29 Arg)", hour: 17, min: 29, zone: 'America/Argentina/Buenos_Aires' },
            { name: "Frontera Cierre (18:01 Arg)", hour: 18, min: 1, zone: 'America/Argentina/Buenos_Aires' },
            { name: "Mañana (09:00 Arg)", hour: 9, min: 0, zone: 'America/Argentina/Buenos_Aires' }
        ];
        
        report += `\n| Escenario | Hora Simulada | Zona Horaria | Veredicto Kernel | Razón |\n`;
        report += `|---|---|---|---|---|\n`;
        
        for (const scene of scenarios) {
            const simulatedDate = DateTime.now().setZone(scene.zone).set({ hour: scene.hour, minute: scene.min }).toJSDate();
            const result = await scheduleService.isBusinessOpen('location', loc.id, simulatedDate);
            
            const statusIcon = result.isOpen === true ? '✅ ABIERTO' : result.isOpen === false ? '🔴 CERRADO' : '❓ INDEFINIDO';
            report += `| ${scene.name} | ${scene.hour}:${scene.min} | ${scene.zone} | ${statusIcon} | ${result.reason} |\n`;
        }
        report += `\n---\n`;
    }
    
    report += `\n## 🛠️ Conclusiones Técnicas\n`;
    report += `1. **Desfase Detectado:** Si la cuenta no tiene timezone, el sistema usa UTC, lo que suma 3 horas a la realidad de Argentina.\n`;
    report += `2. **Sede B sin Datos:** Si no hay intervalos, el sistema retorna 'no_intervals' con isOpen: false, lo que confunde a la IA.\n`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`✨ Reporte generado en: ${reportPath}`);
}

main().catch(console.error);
