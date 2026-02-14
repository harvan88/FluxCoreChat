
import { wesInterpreterService } from '../apps/api/src/services/wes-interpreter.service';
import { manifestLoader } from '../apps/api/src/services/manifest-loader.service';
import * as path from 'path';
import * as fs from 'fs';

async function testInterpretation() {
    // Manually load extensions for the test script
    const extensionsDir = path.resolve(process.cwd(), 'extensions');
    if (fs.existsSync(extensionsDir)) {
        const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const extPath = path.join(extensionsDir, entry.name);
                await manifestLoader.loadFromDirectory(extPath);
            }
        }
    }

    const accountId = '4c3a23e2-3c48-4ed6-afbf-21c47e59bc00';
    const conversationId = 'test-conversation-wes';
    const message = 'Hola! me gustaría agendar un turno para este viernes a las 15hs para un corte de pelo.';

    console.log(`\n--- TEST INTERPRETATION ---`);
    console.log(`User: "${message}"`);
    console.log(`Processing...`);

    const analysis = await wesInterpreterService.interpret(accountId, conversationId, message);

    if (analysis) {
        console.log(`\n✅ INTENT DETECTED!`);
        console.log(`Intent: ${analysis.intent}`);
        console.log(`Confidence: ${analysis.confidence}`);
        console.log(`Slots Extracted:`);
        analysis.candidateSlots.forEach(s => {
            console.log(` - ${s.path}: "${s.value}" (Evidence: "${s.evidence.text}")`);
        });

        console.log(`\nResultado: El sistema ahora crearía un ProposedWork y abriría el Work automáticamente.`);
    } else {
        console.log(`\n❌ No transactional intent detected. Fallback to normal chat.`);
    }

    process.exit(0);
}

testInterpretation().catch(console.error);
