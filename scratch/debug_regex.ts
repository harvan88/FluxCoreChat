
const LEGACY_HEADER_PATTERNS = [
    /# INSTRUCCIONES DE USO DE PLANTILLAS[\s\S]*?(?=\n#\s|$)/gi,
    /# LIBRERÍA DE PLANTILLAS[\s\S]*?(?=\n#\s|$)/gi,
    /# LISTA DE PLANTILLAS AUTORIZADAS[\s\S]*?(?=\n#\s|$)/gi,
    /# REGLA DE ORO[\s\S]*?(?=\n#\s|$)/gi,
    /# SISTEMA DE PLANTILLAS OFICIALES[\s\S]*?(?=\n#\s|$)/gi,
    /# PLANTILLAS AUTORIZADAS[\s\S]*?(?=\n#\s|$)/gi,
    /## LIBRERÍA DE PLANTILLAS[\s\S]*?(?=\n#\s|$)/gi,
    /## LIBRERÍA DE INTENCIONES[\s\S]*?(?=\n#\s|$)/gi,
    /## LISTA DE PLANTILLAS AUTORIZADAS[\s\S]*?(?=\n#\s|$)/gi,
];

const content = `# PLANTILLAS AUTORIZADAS

## Principio fundamental: Plantillas son excepción, no regla

Las plantillas solo deben usarse cuando la intención del usuario coincide EXACTAMENTE con una plantilla disponible.

## Uso del token CALL_TEMPLATE:

Si determinas que una plantilla aplica...

## Plantillas disponibles:

- ID: 2EA8
  Nombre: Ximena - Saludo Inicial

## Reglas de uso:

REGLA 1... texto final.`;

let cleaned = content;
for (const pattern of LEGACY_HEADER_PATTERNS) {
    if (pattern.test(cleaned)) {
        console.log("Matched pattern:", pattern.toString());
        cleaned = cleaned.replace(pattern, '');
    } else {
        console.log("Did not match pattern:", pattern.toString());
    }
}

console.log("--- CLEANED ---");
console.log(cleaned);
console.log("--- END ---");
