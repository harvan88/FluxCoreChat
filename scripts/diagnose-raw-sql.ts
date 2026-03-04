#!/usr/bin/env bun
import { db } from '@fluxcore/db';
import { sql } from 'drizzle-orm';

const ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';

console.log('=== TEST 1: Query policy ===');
const policyResult = await db.execute(sql`
    SELECT account_id, mode, response_delay_ms, turn_window_ms, 
           turn_window_typing_ms, turn_window_max_ms, off_hours_policy
    FROM fluxcore_account_policies
    WHERE account_id = ${ACCOUNT_ID}
    LIMIT 1
`) as any;

console.log('Result type:', typeof policyResult);
console.log('Result keys:', Object.keys(policyResult));
console.log('Result.rows:', policyResult.rows);
console.log('Result.rows type:', typeof policyResult.rows);
console.log('Result.rows length:', policyResult.rows?.length);
console.log('Result.rows[0]:', policyResult.rows?.[0]);

console.log('\n=== TEST 2: Query assistant ===');
const assistantResult = await db.execute(sql`
    SELECT id, name, account_id, runtime, status, model_config, 
           external_id, authorized_data_scopes
    FROM fluxcore_assistants
    WHERE account_id = ${ACCOUNT_ID} AND status = 'active'
    LIMIT 1
`) as any;

console.log('Result.rows:', assistantResult.rows);
console.log('Result.rows[0]:', assistantResult.rows?.[0]);

console.log('\n=== TEST 3: All policies ===');
const allPolicies = await db.execute(sql`
    SELECT account_id, mode FROM fluxcore_account_policies
`) as any;

console.log('Total policies:', allPolicies.rows?.length);
console.log('Policies:', allPolicies.rows?.map((r: any) => ({
    accountId: r.account_id,
    mode: r.mode
})));

process.exit(0);
