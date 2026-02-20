import { fluxcoreService } from '../src/services/fluxcore.service';

async function main() {
    try {
        const accountId = '4c3a23e2-3c48-4ed6-afbf-21c47e59bc00'; // Existing accountId from db test
        console.log('Testing getActiveMode...');
        const mode = await fluxcoreService.getActiveMode(accountId);
        console.log('Current mode:', mode);

        console.log('Testing setActiveMode to suggest...');
        const updated = await fluxcoreService.setActiveMode(accountId, 'suggest');
        console.log('Updated mode:', updated);

        console.log('Testing getActiveMode again...');
        const mode2 = await fluxcoreService.getActiveMode(accountId);
        console.log('New mode:', mode2);

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
main();
