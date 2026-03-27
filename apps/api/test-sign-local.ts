import { assetPolicyService } from './src/services/asset-policy.service';

async function testSign() {
  try {
    const assetId = 'f07f52c0-3fed-4398-b9c0-bba2befd8987';
    const result = await assetPolicyService.signAsset({
      assetId,
      actorId: '8f57db0d-902f-4c99-a1fd-bc424bfff007',
      actorType: 'visitor',
      context: { action: 'preview', channel: 'web' }
    });
    console.log(result);
  } catch(e) {
    console.error("DEBUG ERROR", e);
  } finally {
    process.exit(0);
  }
}
testSign();
