---
id: "mdx-parser-service"
type: "bridge-service"
status: "stable"
criticality: "low"
location: "apps/api/src/services/mdx-parser.service.ts"
layers:
  discovery: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Descubierto" }
  connections: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Extension Karen (MDX Parser Service)" }
  subsystem: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Bridge de Procesamiento de Contenido Dinámico" }
  operations: { status: "complete", completed_date: "2026-03-24", confidence: 100, notes: "Type re-exporting, Logic delegation" }
evolution: { current_layer: 4, total_layers: 4, completion_percentage: 100 }
---

# ⚙️ MDXParserService (Bridge)

## 🎯 Propósito
Este servicio actúa como un **Bridge** (puente) a nivel de arquitectura. No contiene lógica propia, sino que expone y tipa las capacidades de procesamiento de MDX (Markdown + Components) que residen originalmente en la extensión **Karen** (Website Builder).

## 🏗️ Delegación Total
Todo el procesamiento real es delegado al servicio ubicado en `extensions/Karen/src/mdx-parser.service`. Esto permite que el núcleo de FluxCore pueda utilizar las potentes herramientas de parsing de Karen para:
- Extraer Frontmatter (metadatos) de documentos.
- Transformar Markdown en un AST (Abstract Syntax Tree) de nodos.
- Identificar componentes interactivos inyectados en el contenido.

## 🔌 Razón de Existencia
Existe para resolver dependencias circulares y proporcionar un punto de acceso centralizado dentro del directorio de servicios estándar de la API, facilitando que otros servicios del core puedan parsear contenido sin importar directamente desde una extensión específica.

## 💡 Ejemplo de Uso
```typescript
// Importar y usar el servicio
import { mdxParserService } from 'apps/api/src/services/mdx-parser.service.ts';

// Ejemplo de invocación típica
const result = await mdxParserService.execute(params);
```
