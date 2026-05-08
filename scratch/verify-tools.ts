import { fluxcoreService } from '../apps/api/src/services/fluxcore.service';

async function verifyTools() {
  const accountId = '65d340af-97ff-4c9b-85d2-b378badeacf4'; // Dr. Jones
  console.log('Fetching definitions...');
  const defs = await fluxcoreService.getToolDefinitions(accountId);
  console.log('Definitions:', JSON.stringify(defs.map(d => d.slug), null, 2));

  console.log('\nFetching connections...');
  const conns = await fluxcoreService.getToolConnections(accountId);
  console.log('Connections:', JSON.stringify(conns.map(c => ({ id: c.id, toolDefId: c.toolDefinitionId, status: c.status })), null, 2));
}

verifyTools().catch(console.error);
