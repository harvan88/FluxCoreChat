import { db, fluxcoreToolDefinitions } from '@fluxcore/db';

async function checkToolNames() {
    console.log('🔍 LISTADO DE HERRAMIENTAS');
    
    try {
        const tools = await db.select({
            id: fluxcoreToolDefinitions.id,
            slug: fluxcoreToolDefinitions.slug,
            name: fluxcoreToolDefinitions.name,
            status: fluxcoreToolDefinitions.status
        }).from(fluxcoreToolDefinitions);
        
        console.table(tools);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkToolNames().catch(console.error);
