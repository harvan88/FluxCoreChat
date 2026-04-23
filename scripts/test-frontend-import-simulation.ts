/**
 * PRUEBA DE INTEGRACIÓN: Simulación de Importación Frontend
 */

import { sign } from 'jsonwebtoken';

const ACCOUNT_ID = '65d340af-97ff-4c9b-85d2-b378badeacf4';
const SECRET = process.env.JWT_SECRET || 'fluxcore-secret-key-2024';

// Generar Token de Admin/User para el test
const token = sign({ sub: ACCOUNT_ID, role: 'admin' }, SECRET);

const testTemplate = {
    name: "Ximena - TEST POST-REFACTOR",
    category: "Test",
    content: "Contenido de prueba post-refactor.",
    authorizeForAI: true,
    aiUsageInstructions: "Usar cuando se esté probando el nuevo motor semántico activado en el bootstrap."
};

async function main() {
    console.log(`\n🚀 SIMULANDO IMPORTACIÓN DESDE EL FRONTEND...`);
    
    try {
        const response = await fetch('http://localhost:3000/api/templates/bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                accountId: ACCOUNT_ID,
                templates: [testTemplate]
            })
        });

        const result = await response.json() as any;
        
        if (result.success) {
            console.log(` ✅ API respondió con éxito: ${result.data.createdCount} plantillas creadas.`);
            
            console.log(`\n⏳ Esperando 3 segundos para que el motor semántico trabaje en segundo plano...`);
            await new Promise(r => setTimeout(r, 3000));

            // Verificar vectores
            console.log(`\n🔍 Verificando vectores en la base de datos...`);
            const { spawnSync } = await import('node:child_process');
            const audit = spawnSync('bun', ['run', 'scripts/check-vectors.ts'], { encoding: 'utf8' });
            console.log(audit.stdout);
            
        } else {
            console.error(` ❌ Error en la API:`, result.message);
        }

    } catch (err: any) {
        console.error(` ❌ Error crítico en el test:`, err.message);
    }
}

main().catch(console.error);
