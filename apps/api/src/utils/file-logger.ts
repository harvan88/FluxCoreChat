
import * as fs from 'fs';
import * as path from 'path';

// Log en la raíz del proyecto (donde corre bun)
const logPath = path.resolve(process.cwd(), 'fluxcore-trace.log');

export function logTrace(msg: string, data?: any) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? JSON.stringify(data) : '';
    const line = `[${timestamp}] ${msg} ${dataStr}\n`;

    try {
        console.log(`[FileLogger] Writing to: ${logPath}`);
        fs.appendFileSync(logPath, line);
    } catch (e) {
        console.error('Failed to write to trace log', e);
    }
}
