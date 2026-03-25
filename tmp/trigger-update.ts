import { documentationQualityService } from '../apps/api/src/services/fluxcore/documentation-quality.service';

async function trigger() {
  console.log('Triggering documentation quality update...');
  const res = await documentationQualityService.getQualityMetrics();
  console.log('Update complete!');
  
  const snapshotErrs = res.formatErrors.filter(e => e.component === '00-SNAPSHOT.md');
  if (snapshotErrs.length > 0) {
     console.log('Errors for 00-SNAPSHOT.md:', snapshotErrs.map(e => e.error));
  }
}

trigger().catch((err) => {
  console.error(err);
  process.exit(1);
});
