import { sign } from 'jsonwebtoken';
import { db } from '@fluxcore/db';

console.log('JWT sign available:', !!sign);
console.log('DB available:', !!db);
