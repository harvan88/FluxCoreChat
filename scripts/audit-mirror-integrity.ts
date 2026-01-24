
import { db, fluxcoreVectorStores, fluxcoreAssistants } from '@fluxcore/db';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    console.error("❌ OPENAI_API_KEY missing");
    process.exit(1);
}

const BASE_URL = 'https://api.openai.com/v1';
const HEADERS = {
    'Authorization': `Bearer ${apiKey}`,
    'OpenAI-Beta': 'assistants=v2',
    'Content-Type': 'application/json'
};

async function fetchOpenAI(endpoint: string) {
    let url = `${BASE_URL}${endpoint}?limit=100`;
    const items: any[] = [];

    // Paginación básica (por ahora solo primera página para speed)
    const resp = await fetch(url, { headers: HEADERS });
    if (!resp.ok) throw new Error(`API Error ${endpoint}: ${resp.statusText}`);
    const data = await resp.json();
    return data.data || [];
}

async function main() {
    console.log('🕵️‍♂️ INICIANDO AUDITORÍA DE INTEGRIDAD DE ESPEJO (MIRROR AUDIT) [REST MODE]\n');

    // --- 1. VECTOR STORES ---
    console.log('📦 --- VECTOR STORES ---');

    const remoteStoresList = await fetchOpenAI('/vector_stores');
    const remoteStores = new Map(remoteStoresList.map((vs: any) => [vs.id, vs]));
    console.log(`☁️ OpenAI Vector Stores: ${remoteStores.size}`);

    const localStores = await db.select().from(fluxcoreVectorStores);

    const localOpenAIStores = localStores.filter(s => s.backend === 'openai');
    console.log(`💾 Local Vector Stores (backend='openai'): ${localOpenAIStores.length}`);

    const ghostsLocal = localOpenAIStores.filter(l => l.externalId && !remoteStores.has(l.externalId));
    const ghostsRemote = Array.from(remoteStores.keys()).filter(rid => !localOpenAIStores.some(l => l.externalId === rid));

    if (ghostsLocal.length > 0) {
        console.warn(`⚠️ FANTASMAS LOCALES (En DB pero no en OpenAI): ${ghostsLocal.length}`);
        ghostsLocal.forEach(g => console.log(`   - ${g.name} (ExtID: ${g.externalId})`));
    } else {
        console.log('✅ No hay fantasmas locales de Vector Stores.');
    }

    if (ghostsRemote.length > 0) {
        console.warn(`⚠️ FANTASMAS REMOTOS (En OpenAI pero no en DB): ${ghostsRemote.length}`);
        ghostsRemote.slice(0, 5).forEach(rid => console.log(`   - ${remoteStores.get(rid)?.name} (${rid})`));
    }

    // --- 2. ASISTENTES ---
    console.log('\n🤖 --- ASISTENTES ---');

    const remoteAssistantsList = await fetchOpenAI('/assistants');
    const remoteAssistants = new Map(remoteAssistantsList.map((a: any) => [a.id, a]));
    console.log(`☁️ OpenAI Assistants: ${remoteAssistants.size}`);

    const localAssistants = await db.select().from(fluxcoreAssistants);
    const localOpenAIAssistants = localAssistants.filter(a => a.runtime === 'openai' || (a.modelConfig as any)?.provider === 'openai');
    console.log(`💾 Local Assistants (runtime='openai'): ${localOpenAIAssistants.length}`);

    const asGhostsLocal = localOpenAIAssistants.filter(l => l.externalId && !remoteAssistants.has(l.externalId));
    const asGhostsRemote = Array.from(remoteAssistants.keys()).filter(rid => !localOpenAIAssistants.some(l => l.externalId === rid));

    if (asGhostsLocal.length > 0) {
        console.warn(`⚠️ FANTASMAS LOCALES (Asistentes en DB con ID externo inválido): ${asGhostsLocal.length}`);
        asGhostsLocal.forEach(g => console.log(`   - ${g.name} (ExtID: ${g.externalId})`));
    } else {
        console.log('✅ No hay fantasmas locales de Asistentes.');
    }

    if (asGhostsRemote.length > 0) {
        console.warn(`⚠️ FANTASMAS REMOTOS (Asistentes en OpenAI no linkeados a FluxCore): ${asGhostsRemote.length}`);
        asGhostsRemote.slice(0, 5).forEach(rid => console.log(`   - ${remoteAssistants.get(rid)?.name} (${rid})`));
    }

    console.log('\n🏁 Auditoría Finalizada.');
    process.exit(0);
}

main().catch(e => {
    console.error('Error fatal:', e);
    process.exit(1);
});
