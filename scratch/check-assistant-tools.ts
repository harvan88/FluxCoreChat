import { db, fluxcoreAssistantTools, fluxcoreToolConnections, fluxcoreToolDefinitions } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function checkAssistantTools() {
  const assistantId = '3ba56d5b-495e-4474-8974-7c5beebcae5b';
  const tools = await db.select().from(fluxcoreAssistantTools).where(eq(fluxcoreAssistantTools.assistantId, assistantId));
  console.log('Assistant Tools for 3ba56d5b:', JSON.stringify(tools, null, 2));

  for (const t of tools) {
      if (t.toolConnectionId) {
          const [conn] = await db.select().from(fluxcoreToolConnections).where(eq(fluxcoreToolConnections.id, t.toolConnectionId)).limit(1);
          if (conn) {
              const [def] = await db.select().from(fluxcoreToolDefinitions).where(eq(fluxcoreToolDefinitions.id, conn.toolDefinitionId)).limit(1);
              console.log(`Tool ID ${t.id} -> Connection ${conn.id} -> Definition ${def?.slug || 'NOT FOUND'} (${def?.name || 'UNKNOWN'})`);
          } else {
              console.log(`Tool ID ${t.id} -> Connection NOT FOUND`);
          }
      }
  }
}

checkAssistantTools().catch(console.error);
