import { db, sql } from '@fluxcore/db';

async function auditAssistantsAndAgents() {
  try {
    const assistantsRes = await db.execute(sql`SELECT count(*) as total FROM fluxcore_assistants`).catch(() => [{ total: 'N/A' }]);
    const agentsRes = await db.execute(sql`SELECT count(*) as total FROM fluxcore_agents`).catch(() => [{ total: 'N/A' }]);
    const agentAssistsRes = await db.execute(sql`SELECT count(*) as total FROM fluxcore_agent_assistants`).catch(() => [{ total: 'N/A' }]);
    
    console.log(`📊 fluxcore_assistants: ${assistantsRes[0].total}`);
    console.log(`📊 fluxcore_agents: ${agentsRes[0].total}`);
    console.log(`📊 fluxcore_agent_assistants: ${agentAssistsRes[0].total}`);
    
    if (agentsRes[0].total !== 'N/A' && Number(agentsRes[0].total) > 0) {
      const data = await db.execute(sql`SELECT * FROM fluxcore_agents LIMIT 5`);
      console.log('\n📄 Primeros 5 agents:');
      console.table(data);
    }
    
  } catch (error) {
    console.error('❌ Error in audit:', error);
  } finally {
    process.exit(0);
  }
}

auditAssistantsAndAgents();
