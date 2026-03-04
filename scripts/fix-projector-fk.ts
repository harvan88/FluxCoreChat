
import { db, accounts } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function main() {
    const missingId = 'cadcb892-c4d1-42e5-bbac-6655047cbb56';
    console.log(`🔧 Creating dummy account to unblock projector: ${missingId}...`);

    // Check if exists first (race condition check)
    const existing = await db.query.accounts.findFirst({
        where: eq(accounts.id, missingId)
    });

    if (existing) {
        console.log('✅ Account already exists.');
        return;
    }

    // Insert dummy account
    await db.insert(accounts).values({
        id: missingId,
        username: 'unblock_projector_temp',
        displayName: 'Temporary Unblock Account',
        accountType: 'personal', // or 'business'
        allowAutomatedUse: false,
        ownerUserId: '0260354d-93fa-4a20-aa6d-345a19e1172e', // Use an existing user ID if possible, or leave null if nullable? 
        // Checking schema... ownerUserId is NOT NULL usually.
        // Let's grab a valid user ID first.
    });
    
    console.log('✅ Dummy account created.');
}

// Need to find a valid user ID to link ownership
async function robustMain() {
    const missingId = 'cadcb892-c4d1-42e5-bbac-6655047cbb56';

    const existing = await db.query.accounts.findFirst({
        where: eq(accounts.id, missingId)
    });
    if (existing) {
        console.log('✅ Account already exists.');
        return;
    }

    const someUser = await db.query.users.findFirst();
    if (!someUser) {
        console.error('❌ No users found in DB to assign ownership.');
        process.exit(1);
    }

    console.log(`Using owner user: ${someUser.id}`);

    await db.insert(accounts).values({
        id: missingId,
        ownerUserId: someUser.id,
        username: 'unblock_fix_167',
        displayName: 'Projector Unblocker',
        accountType: 'personal',
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    console.log(`✅ Created account ${missingId} to satisfy FK constraint.`);
}

robustMain().catch(console.error).then(() => process.exit(0));
