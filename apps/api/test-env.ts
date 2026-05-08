console.log('FLUXCORE_PORT:', process.env.FLUXCORE_PORT);
console.log('PORT:', process.env.PORT);
import fs from 'fs';
const envPath = '../../.env';
console.log('exists?', fs.existsSync(envPath));
if (fs.existsSync(envPath)) console.log(fs.readFileSync(envPath, 'utf8').split('\n').filter(l => l.includes('PORT')));
