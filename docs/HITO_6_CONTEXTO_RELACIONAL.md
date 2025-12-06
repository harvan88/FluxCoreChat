# Hito 6: Contexto Relacional

> **Estado**: ✅ Completado  
> **Fecha**: 2025-12-06

## Resumen

Implementación del sistema de contexto relacional unificado, permitiendo agregar notas, preferencias y reglas a las relaciones con un límite de 2000 caracteres y perspectivas bilaterales.

## Componentes Implementados

### Servicio de Contexto (FC-130, FC-131)

**Archivo**: `apps/api/src/services/relationship-context.service.ts`

Funcionalidades:
- CRUD de entradas de contexto
- Validación de límite de 2000 caracteres
- Gestión de perspectivas bilaterales
- Filtrado por tipo de entrada

### API Endpoints (FC-132, FC-133)

**Archivo**: `apps/api/src/routes/context.routes.ts`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /context/:relId | Obtener contexto completo |
| POST | /context/:relId/entries | Agregar entrada |
| PATCH | /context/:relId/entries/:idx | Actualizar entrada |
| DELETE | /context/:relId/entries/:idx | Eliminar entrada |
| GET | /context/:relId/perspective/:accId | Obtener perspectiva |
| PATCH | /context/:relId/perspective/:accId | Actualizar perspectiva |
| GET | /context/:relId/chars | Obtener límite de caracteres |

## Estructura de Datos

### Entrada de Contexto

```typescript
interface ContextEntry {
  author_account_id: string;  // Quién escribió la entrada
  content: string;            // Contenido (máx 2000 chars total)
  type: 'note' | 'preference' | 'rule';
  created_at: string;         // ISO timestamp
}
```

### Tipos de Entrada

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `note` | Información general | "Cliente VIP desde 2020" |
| `preference` | Preferencias del contacto | "Prefiere contacto por WhatsApp" |
| `rule` | Reglas de negocio | "Si cancela, ofrecer 10% descuento" |

### Perspectiva Bilateral

```typescript
interface RelationshipPerspective {
  saved_name: string | null;  // Nombre personalizado
  tags: string[];             // Etiquetas
  status: 'active' | 'blocked' | 'archived';
}
```

## Límite de Caracteres

- **Máximo total**: 2000 caracteres
- **Validación**: Al agregar/actualizar entradas
- **Endpoint**: `/context/:relId/chars` para consultar disponibilidad

```json
{
  "used": 150,
  "available": 1850,
  "max": 2000
}
```

## Integración con IA

El PromptBuilder (Hito 5) ya utiliza el contexto relacional:

```typescript
// En prompt-builder.ts
private buildRelationshipContext(context: ContextEntry[]): string {
  const notes = context.filter(c => c.type === 'note');
  const preferences = context.filter(c => c.type === 'preference');
  const rules = context.filter(c => c.type === 'rule');
  // ...
}
```

## Estado de Pruebas

### Pruebas Automatizadas

| Suite | Pruebas | Estado |
|-------|---------|--------|
| Chat | 8/8 | ✅ |
| Extensions | 11/11 | ✅ |
| AI Core | 12/12 | ✅ |
| **Context** | **16/16** | ✅ |
| **Total** | **47/47** | ✅ |

### Tests de Contexto

1. Register User ✅
2. Create Account 1 ✅
3. Create Account 2 ✅
4. Create Relationship ✅
5. Get Initial Context (Empty) ✅
6. Add Note Entry ✅
7. Add Preference Entry ✅
8. Add Rule Entry ✅
9. Get Context With Entries ✅
10. Update Entry ✅
11. Delete Entry ✅
12. Get Character Limit ✅
13. Get Perspective ✅
14. Update Perspective - Saved Name ✅
15. Update Perspective - Tags ✅
16. Validate Character Limit ✅

## Archivos Creados

- `apps/api/src/services/relationship-context.service.ts`
- `apps/api/src/routes/context.routes.ts`
- `apps/api/src/test-context.ts`
- `docs/HITO_6_CONTEXTO_RELACIONAL.md`
- `docs/INSTRUCCIONES_PRUEBA_HITO6.md`

## Uso

### Agregar Entrada de Contexto

```bash
curl -X POST http://localhost:3000/context/$REL_ID/entries \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "authorAccountId": "uuid",
    "content": "Cliente VIP desde 2020",
    "type": "note"
  }'
```

### Actualizar Perspectiva

```bash
curl -X PATCH http://localhost:3000/context/$REL_ID/perspective/$ACC_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "savedName": "Mi mejor cliente",
    "tags": ["vip", "frecuente"]
  }'
```

## Próximos Pasos

1. **Frontend**: Componentes React para edición de contexto
2. **UI**: ContactDetailPanel con editor de contexto
3. **Tags**: Autocompletado y sugerencias de tags
4. **Historial**: Registro de cambios en el contexto

---

**Última actualización**: 2025-12-06
