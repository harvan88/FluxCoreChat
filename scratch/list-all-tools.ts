import { db, fluxcoreToolDefinitions } from '@fluxcore/db';

async function listAllTools() {
  const tools = await db.select().from(fluxcoreToolDefinitions);
  console.log('All Tool Definitions:', JSON.stringify(tools, null, 2));
}

listAllTools().catch(console.error);
