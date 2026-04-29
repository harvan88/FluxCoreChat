import { sovereignIdentityService } from '../../../../apps/api/src/services/fluxcore/sovereign-identity.service';

async function validateIdentityParity() {
    console.log('🧪 VALIDACIÓN DE PARIDAD: SovereignIdentityService');
    console.log('--------------------------------------------------');

    const testCases = [
        { uuid: '9ed5d878-1830-421e-8e19-82a7042355b1', expectedMask: '9EB1' },
        { uuid: '4804b6a8-30cb-4944-92f9-2e7f0f6915ea', expectedMask: '48EA' },
        { uuid: 'ca0e4a08-b61f-411d-9feb-47fcef21c587', expectedMask: 'CA87' },
        { uuid: '2eeffed2-61f1-40cc-a107-945033f5eaa8', expectedMask: '2EA8' }
    ];

    let failures = 0;

    testCases.forEach(({ uuid, expectedMask }) => {
        const generatedMask = sovereignIdentityService.generateMaskID(uuid);
        const match = generatedMask === expectedMask;
        
        console.log(`${match ? '✅' : '❌'} UUID: ${uuid}`);
        console.log(`   Esperado: ${expectedMask} | Generado: ${generatedMask}`);
        
        if (!match) failures++;
    });

    console.log('--------------------------------------------------');
    if (failures === 0) {
        console.log('✨ PARIDAD GARANTIZADA: El nuevo servicio es idéntico al algoritmo actual.');
    } else {
        console.error(`🚨 FALLO: Se detectaron ${failures} discrepancias en el algoritmo.`);
        process.exit(1);
    }

    process.exit(0);
}

validateIdentityParity().catch(console.error);
