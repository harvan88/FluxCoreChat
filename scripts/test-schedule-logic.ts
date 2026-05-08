import { db, accountLocations, weeklySchedules, weeklyIntervals, accounts } from '@fluxcore/db';
import { scheduleService } from '../apps/api/src/services/schedule.service';
import { eq, and } from 'drizzle-orm';
import { DateTime } from 'luxon';

async function test() {
    console.log("🔍 Verificando sedes y horarios...");
    const locations = await db.select({
        id: accountLocations.id,
        name: accountLocations.name,
        status: accountLocations.status,
        timezone: accounts.timezone
    })
    .from(accountLocations)
    .innerJoin(accounts, eq(accountLocations.accountId, accounts.id))
    .where(eq(accountLocations.accountId, '65d340af-97ff-4c9b-85d2-b378badeacf4'));
    
    for (const loc of locations) {
        console.log(`\n📍 Sede: ${loc.name} (ID: ${loc.id}) - Status: ${loc.status}`);
        
        const days = await db.select().from(weeklySchedules).where(and(eq(weeklySchedules.ownerType, 'location'), eq(weeklySchedules.ownerId, loc.id)));
        const intervals = await db.select().from(weeklyIntervals).where(and(eq(weeklyIntervals.ownerType, 'location'), eq(weeklyIntervals.ownerId, loc.id)));
        
        console.log(`   - Días configurados: ${days.length}`);
        console.log(`   - Intervalos configurados: ${intervals.length}`);
        
        const result = await scheduleService.isBusinessOpen('location', loc.id);
        console.log(`   - ⏱️ isBusinessOpen(ahora):`, result);

        if (intervals.length > 0) {
            // Test del borde de cierre
            const sample = intervals[0];
            const [hours, minutes] = sample.closeTime.split(':').map(Number);
            
            // Creamos un punto en el tiempo absoluto que en el timezone de la sede sea exactamente el closeTime
            const exactCloseTime = DateTime.now().setZone(loc.timezone || 'UTC').set({ 
                hour: hours, minute: minutes, second: 0, millisecond: 0 
            }).toJSDate();

            const boundaryResult = await scheduleService.isBusinessOpen('location', loc.id, exactCloseTime);
            console.log(`   - ⏱️ isBusinessOpen(en límite exacto ${sample.closeTime}):`, boundaryResult);
        }
    }
    process.exit(0);
}
test();
