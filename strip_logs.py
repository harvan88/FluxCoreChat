import re

with open('c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/core/kernel.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'console.log' in line and '[Kernel]' in line and ('START =' in line or 'END =' in line or 'DEBUG:' in line or 'CANDIDATE RECEIVED:' in line or '  - ' in line or 'CANONICALIZANDO:' in line or 'Fact:' in line or 'Source:' in line or 'Object:' in line or 'Evidence ' in line or 'Adapter:' in line or 'CANONICAL GENERADO:' in line or 'Length:' in line or 'Preview:' in line or 'VERIFICANDO FIRMA:' in line or 'Secret:' in line or 'Received:' in line or 'Expected:' in line or 'Match:' in line or 'PREPARING INSERT:' in line or 'factType:' in line or 'source:' in line or 'subject:' in line or 'occurredAt:' in line or 'checksum:' in line or 'fingerprint:' in line):
        continue
    if 'console.error' in line and '[Kernel]' in line and 'DEBUG:' in line:
        continue
    new_lines.append(line)

with open('c:/Users/harva/Documents/Trabajos/meetgar/FluxCoreChat/FluxCoreChat/apps/api/src/core/kernel.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

