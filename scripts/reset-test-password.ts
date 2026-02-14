
import { db, users } from '@fluxcore/db';
import { eq } from 'drizzle-orm';
import { hash } from 'bcrypt';

async function resetPassword() {
    const email = 'testchat1769032497843@example.com';
    const newPassword = 'password123';

    const passwordHash = await hash(newPassword, 10);

    await db.update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.email, email));

    console.log(`--- PASSWORD RESET SUCCESSFUL ---`);
    console.log(`Email: ${email}`);
    console.log(`Nuevo Password: ${newPassword}`);
    process.exit(0);
}

resetPassword().catch(console.error);
