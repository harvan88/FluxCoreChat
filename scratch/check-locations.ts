import { db, accountLocations } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { scheduleService } from '../apps/api/src/services/schedule.service';

const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4';

async function checkLocations() {
    console.log(`🔍 Checking locations for account: ${accountId}`);
    
    const locations = await db
        .select()
        .from(accountLocations)
        .where(eq(accountLocations.accountId, accountId));

    console.log(`📍 Total locations found: ${locations.length}`);
    console.log(JSON.stringify(locations, null, 2));

    console.log(`\n📝 Testing ScheduleService.getScheduleSummary...`);
    const summary = await scheduleService.getScheduleSummary(accountId);
    console.log(`--- SUMMARY START ---`);
    console.log(summary);
    console.log(`--- SUMMARY END ---`);
}

checkLocations().catch(console.error);
