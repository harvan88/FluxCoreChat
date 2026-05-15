import { db, automationRules } from '@fluxcore/db';
import { eq, and, isNull } from 'drizzle-orm';
import { automationController } from './services/automation-controller.service';

async function runTests() {
  const accountId = '3e94f74e-e6a0-4794-bd66-16081ee3b02d'; // Harvan account
  const relationshipId = '709bf2df-18f3-43c8-a9a2-3c5b87690efb'; // valid uuid
  
  console.log('--- TEST 1: SET GLOBAL RULE ---');
  await automationController.setRule(accountId, 'auto', { relationshipId: undefined });
  
  let globalRule = await automationController.getGlobalRule(accountId);
  console.log('Global Rule:', globalRule?.mode, globalRule ? '✅ (Exito)' : '❌ (Fallo)');

  console.log('\n--- TEST 2: SET GRANULAR RULE ---');
  await automationController.setRule(accountId, 'suggest', { relationshipId });
  
  let granularRule = await automationController.getRelationshipMode(accountId, relationshipId);
  console.log('Granular Rule:', granularRule, granularRule ? '✅ (Exito)' : '❌ (Fallo)');

  console.log('\n--- TEST 3: GET EFFECTIVE RULE FOR CONVERSATION ---');
  let effectiveForRel = await automationController.getEffectiveRule(accountId, relationshipId);
  console.log('Effective mode for relationship:', effectiveForRel?.mode, effectiveForRel?.mode === 'suggest' ? '✅' : '❌');

  console.log('\n--- TEST 4: GET EFFECTIVE RULE FOR ANOTHER CONVERSATION ---');
  let effectiveForOther = await automationController.getEffectiveRule(accountId, '123e4567-e89b-12d3-a456-426614174000');
  console.log('Effective mode for other relationship:', effectiveForOther?.mode, effectiveForOther?.mode === 'auto' ? '✅' : '❌');

  console.log('\n--- TEST 5: EVALUATE TRIGGER ---');
  let evaluation = await automationController.evaluateTrigger({
    accountId,
    relationshipId,
    messageContent: 'hola',
    messageType: 'incoming'
  });
  console.log('Trigger evaluation (relationship):', evaluation.mode, evaluation.mode === 'suggest' ? '✅' : '❌');

  console.log('\nCleaning up tests...');
  await db.delete(automationRules).where(eq(automationRules.relationshipId, relationshipId));
  process.exit(0);
}

runTests().catch(console.error);
