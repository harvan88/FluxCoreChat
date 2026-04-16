import { permissionService } from '../services/permission.service';

async function main() {
    const targetVsId = '48bebce0-a795-42df-9dc5-daf060b2d32b';
    const targetAccountId = '2fef52df-7262-46c5-96ba-7fd22eea188c';

    console.log(`=== CHECKING PERMISSIONS ===`);
    const access = await permissionService.checkAccess(targetAccountId, 'vector_store', targetVsId, 'read');
    console.log(`Access check result:`, access);
    
    process.exit(0);
}

main().catch(console.error);
