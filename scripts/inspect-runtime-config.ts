#!/usr/bin/env bun
import { fluxPolicyContextService } from '../apps/api/src/services/flux-policy-context.service';

const ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';
const CONTACT_ID = '';
const CHANNEL = 'web';

try {
  const { policyContext, runtimeConfig } = await fluxPolicyContextService.resolveContext(
    ACCOUNT_ID,
    CONTACT_ID,
    CHANNEL
  );

  console.log('=== POLICY CONTEXT ===');
  console.log(JSON.stringify(policyContext, null, 2));
  
  console.log('\n=== RUNTIME CONFIG ===');
  console.log(JSON.stringify(runtimeConfig, null, 2));

  // Check for null/undefined values
  console.log('\n=== NULL/UNDEFINED CHECK ===');
  for (const [key, value] of Object.entries(policyContext)) {
    if (value === null || value === undefined) {
      console.log(`⚠️ policyContext.${key} is ${value}`);
    }
  }
  for (const [key, value] of Object.entries(runtimeConfig)) {
    if (value === null || value === undefined) {
      console.log(`⚠️ runtimeConfig.${key} is ${value}`);
    }
  }
} catch (error) {
  console.error('ERROR:', error);
}

process.exit(0);
