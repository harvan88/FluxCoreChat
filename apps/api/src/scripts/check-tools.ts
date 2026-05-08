import { db, fluxcoreToolDefinitions, fluxcoreToolConnections } from '@fluxcore/db';

async function checkTools() {
    console.log('🔍 DIAGNÓSTICO DE HERRAMIENTAS');
    
    try {
        const tools = await db.select().from(fluxcoreToolDefinitions);
        console.log('\n📊 DEFINICIONES DE HERRAMIENTAS:');
        console.table(tools);
        
        const connections = await db.select().from(fluxcoreToolConnections);
        console.log('\n📊 CONEXIONES DE HERRAMIENTAS:');
        console.table(connections);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkTools().catch(console.error);
