import * as path from 'path';
import * as fs from 'fs';
import { manifestLoader } from '../services/manifest-loader.service';

export const bootstrapKernel = async () => {
  // Fix: Go up 4 levels from apps/api/src/bootstrap to reach workspace root
  const extensionsDir = path.resolve(__dirname, '../../../../extensions');
  console.log('🔍 Scanning extensions dir:', extensionsDir);
  if (!fs.existsSync(extensionsDir)) {
    return;
  }

  const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const extPath = path.join(extensionsDir, entry.name);
    console.log(' - Found potential extension:', entry.name);
    const manifest = await manifestLoader.loadFromDirectory(extPath);
    if (manifest) {
      console.log('   ✅ Loaded manifest:', manifest.id);
    } else {
      console.log('   ❌ No valid manifest found');
    }
  }

  console.log(`🧩 Loaded ${manifestLoader.getAllManifests().length} extensions`);
};
