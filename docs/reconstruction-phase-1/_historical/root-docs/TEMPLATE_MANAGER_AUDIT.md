# Auditoría del Sistema de Plantillas
> Fecha: 2026-02-04 | Estado: INCOMPLETO

---

## 1. Respuestas a Preguntas del Usuario

### ¿Entiendo qué es y para qué sirve el sistema?
**SÍ.** El Template Manager es un sistema para:
- Crear mensajes predefinidos reutilizables
- Adjuntar archivos (assets) a plantillas
- Usar variables dinámicas (`{{nombre}}`, `{{fecha}}`)
- Enviar mensajes consistentes a través de canales (WhatsApp, etc.)

### ¿Qué se espera que tenga una plantilla?
Según `PLAN_TEMPLATE_MANAGER.md`:
- **Nombre** (identificación)
- **Contenido** (texto con variables)
- **Variables** (tipadas: text, number, date, contact)
- **Categoría** (organización)
- **Tags** (filtrado)
- **Assets** (archivos adjuntos)
- **Estado** (activa/inactiva)

### ¿Se comprende que la ingesta tiene límites?
**PARCIALMENTE.** Los límites están definidos en el adaptador de WhatsApp pero NO se aplican aún en la UI de plantillas:
- WhatsApp: 1 archivo por mensaje (política de canal)
- Tamaño máximo de assets: 100MB (hardcoded)
- No hay validación de límites de caracteres por canal

### ¿Cómo el usuario va a navegar las plantillas?
**IMPLEMENTADO:** 
- ActivityBar → Tools → Plantillas → Abre panel en ViewPort
- TemplateManager muestra lista con TemplateCards
- Click en card abre TemplateEditor en tab

### ¿Se respeta la verticalidad canónica de diseño?
**PARCIALMENTE:**
- ✅ Layout vertical 100% ancho
- ✅ Sidebar + ViewPort pattern
- ⚠️ El editor usa layout horizontal interno (edit/preview side-by-side)
- ⚠️ No hay vista móvil optimizada

### ¿Puede el usuario crear, editar, borrar, duplicar plantillas?
| Acción | Estado | Notas |
|--------|--------|-------|
| Crear | ✅ | Funciona via TemplateManager |
| Editar | ✅ | TemplateEditor con preview |
| Borrar | ✅ | Con confirmación |
| Duplicar | ✅ | Implementado en TemplateCard |
| **Reconocer** | ⚠️ | Lista sin thumbnails de assets |

### ¿Se garantiza autosave sin errores?
**NO IMPLEMENTADO.** El editor requiere click manual en "Guardar". No hay:
- Debounce autosave
- Detección de cambios no guardados al cerrar
- Recuperación de drafts

### ¿Tenemos pruebas de persistencia y visualización de archivos?
**NO.** No existen:
- Tests E2E para upload/link de assets
- Tests unitarios para TemplateAssetPicker
- Verificación de integridad de archivos

### ¿Se pueden ver plantillas desde el input del chat y enviarlas?
**SÍ (IMPLEMENTADO):**
- ✅ Botón "Plantillas" integrado en `StandardComposer` y `FluxCoreComposer`.
- ✅ Lógica de envío unificada en el backend via `templateService.executeTemplate`.
- ✅ Envío de assets y texto en una sola operación atómica.
- ✅ Los assets se vinculan correctamente en `message_assets`.

### ¿Es esta solución escalable y robusta?
**PARCIALMENTE:**
- ✅ Arquitectura modular (servicios separados)
- ✅ Zustand store bien estructurado
- ⚠️ Sin paginación en listado de plantillas
- ⚠️ Sin caché optimizado para assets
- ❌ Sin tests
- ❌ Sin manejo de errores robusto

### ¿Podrá la IA consumir y enviar automáticamente plantillas?
**SÍ (IMPLEMENTADO):**
- ✅ El AI Engine utiliza la herramienta `send_template`.
- ✅ `AITemplateService` actúa como validador de permisos.
- ✅ El núcleo (`TemplateService`) ejecuta la acción real.
- ✅ La IA dispara el envío pero no conoce el contenido sensible (Blind Trigger).

---

## 2. Estado de Componentes vs Plan

| Componente | Plan | Estado | Notas |
|------------|------|--------|-------|
| `TemplateManager.tsx` | ✓ | ✅ | Funcional |
| `TemplateList.tsx` | ✓ | ✅ | Funcional |
| `TemplateCard.tsx` | ✓ | ✅ | Funcional |
| `TemplateEditor.tsx` | ✓ | ⚠️ | Sin autosave |
| `TemplateAssetPicker.tsx` | ✓ | ⚠️ | Bug de assetId corregido |
| `hooks/useTemplates.ts` | ✓ | ⚠️ | Básico, sin React Query |
| `store/templateStore.ts` | ✓ | ✅ | Funcional |
| `types.ts` | ✓ | ✅ | Completo |
| **ViewRegistry integration** | ✓ | ✅ | Registrado via `chatcore-views.tsx` |
| **ChatComposer integration** | ✓ | ✅ | Implementado en composers |
| **Soberanía de Chat Core** | ✓ | ✅ | Lógica centralizada en backend |
| **Autosave** | Implícito | ❌ | Pendiente (PRUEBA DE ESTABILIDAD PRIMERO) |
| **Tests E2E** | ✓ | ❌ | No existen |

---

## 3. Bugs Encontrados y Corregidos Hoy

| Bug | Causa | Fix |
|-----|-------|-----|
| `NOT_FOUND` en `/api/templates` | Prefijo incorrecto en backend | Cambiado a `/api/templates` |
| Conflicto de parámetros Elysia | `:id` vs `:templateId` | Unificado a `:templateId` |
| `assetId` no enviado al vincular | `accountId` en body vs query | Corregido frontend |
| `assetId` no devuelto en commit | Backend devolvía `id` | Mapeado a `assetId` |

---

## 4. Tareas Pendientes para Completar Template Manager

### Fase 1: Estabilización (4h)
- [ ] **TM-001**: Verificar flujo completo upload → link → visualización
- [ ] **TM-002**: Agregar logs detallados para debugging
- [ ] **TM-003**: Manejar errores con mensajes claros al usuario
- [ ] **TM-004**: Implementar confirmación al cerrar editor con cambios

### Fase 2: Autosave (2h)
- [ ] **TM-010**: Implementar debounce autosave (2s delay)
- [ ] **TM-011**: Indicador visual de "guardando..." / "guardado"
- [ ] **TM-012**: Persistir drafts en localStorage

### Fase 3: Integración Chat (4h)
- [x] **TM-020**: Botón "Plantillas" en ChatComposer
- [x] **TM-021**: Modal/Popover selector de plantillas
- [x] **TM-022**: Lógica de inserción de contenido (Refactorizado a ejecución backend)
- [x] **TM-023**: Envío de assets (Refactorizado a ejecución backend)
- [ ] **TM-024**: Respeto de límites por canal (En progreso)

### Fase 4: Visualización de Assets (2h)
- [ ] **TM-030**: Thumbnails de imágenes en TemplateCard
- [ ] **TM-031**: Preview de archivos en TemplateEditor
- [ ] **TM-032**: Indicador de cantidad de assets en lista

### Fase 5: Tests (4h)
- [ ] **TM-040**: Test E2E: CRUD de plantillas
- [ ] **TM-041**: Test E2E: Upload y vinculación de asset
- [ ] **TM-042**: Test E2E: Envío desde chat
- [ ] **TM-043**: Test unitario: templateStore

### Fase 6: IA Integration (3h)
- [x] **TM-050**: Endpoint `/api/templates/execute` para ejecución unificada
- [x] **TM-051**: Comando FluxCore "enviar plantilla X" (Tool logic)
- [x] **TM-052**: Respuesta estructurada con assets (Backend integration)

---

## 5. Estimación Total

| Fase | Horas | Prioridad |
|------|-------|-----------|
| Estabilización | 4h | P0 (Crítico) |
| Autosave | 2h | P1 (Alto) |
| Chat Integration | 4h | P0 (Crítico) |
| Visualización Assets | 2h | P2 (Medio) |
| Tests | 4h | P1 (Alto) |
| IA Integration | 3h | P2 (Medio) |
| **TOTAL** | **19h** | |

---

## 6. Conclusión

El sistema de plantillas tiene una **base arquitectónica sólida** (80% de componentes UI creados) pero carece de:
1. **Integración con Chat** - El feature más crítico
2. **Autosave** - UX básica esperada
3. **Tests** - Garantía de estabilidad
4. **Integración IA** - Valor diferencial

**Recomendación:** Ejecutar Fases 1 y 3 como prioridad absoluta (8h) para tener un MVP funcional end-to-end.

---

*Documento generado automáticamente - 2026-02-04*
