#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const HAROLD_ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';

console.log('=== Configuración del Asistente y Política ===\n');

// Policy
const policyResult = await db.execute(sql`
    SELECT account_id, mode, response_delay_ms
    FROM fluxcore_account_policies
    WHERE account_id = ${HAROLD_ACCOUNT_ID}
`) as any;

if (policyResult[0]) {
    console.log('✓ Policy encontrada:');
    console.log(`  Mode: ${policyResult[0].mode}`);
    console.log(`  Response delay: ${policyResult[0].response_delay_ms}ms\n`);
} else {
    console.log('⚠ NO hay policy para esta cuenta\n');
}

// Assistant
const assistantResult = await db.execute(sql`
    SELECT id, name, status, runtime, model_config
    FROM fluxcore_assistants
    WHERE account_id = ${HAROLD_ACCOUNT_ID} AND status = 'active'
`) as any;

if (assistantResult[0]) {
    const ast = assistantResult[0];
    console.log('✓ Asistente activo:');
    console.log(`  ID: ${ast.id.slice(0, 8)}`);
    console.log(`  Name: ${ast.name}`);
    console.log(`  Runtime: ${ast.runtime}`);
    console.log(`  Status: ${ast.status}`);
    
    const modelConfig = typeof ast.model_config === 'string' 
        ? JSON.parse(ast.model_config) 
        : ast.model_config;
    console.log(`  Model: ${modelConfig?.provider}/${modelConfig?.model}\n`);
} else {
    console.log('⚠ NO hay asistente activo para esta cuenta\n');
}

process.exit(0);
