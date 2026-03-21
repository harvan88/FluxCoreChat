# Template para Corregir Frontmatter YAML

## 📋 Pasos para Corregir Cada Documento

### 1. Agregar Frontmatter YAML al inicio del archivo

```yaml
---
type: ui-component
status: stable
criticality: medium
location: apps/web/src/components/ui/[NOMBRE_COMPONENTE].tsx
---
```

### 2. Valores Posibles para `type`:
- `ui-component` - Componentes UI básicos
- `smart-component` - Componentes con lógica compleja
- `subsystem` - Subsistemas completos
- `core` - Componentes core del sistema

### 3. Valores Posibles para `status`:
- `stable` - Documento completo y verificado
- `needs_review` - Requiere revisión
- `wip` - En progreso
- `deprecated` - Obsoleto

### 4. Valores Posibles para `criticality`:
- `high` - Crítico para el sistema
- `medium` - Importante pero no crítico
- `low` - Opcional o secundario

### 5. `location` debe apuntar al archivo real del componente

---

## 🎯 Documentos que Necesitan Corrección (26 total):

### Archivos Principales:
1. `00-AI_DOCUMENTATION_STANDARD.md`
2. `00-documentation-index.md`
3. `APP_LAYOUT_ROUTING.md`
4. `ASSISTANTDETAIL.md`
5. `ASSISTANTS_SUBSYSTEM.md`
6. `COPYBUTTON_COMPONENT.md`
7. `FLUXCORE_TEMPLATE_CONFIG.md`
8. `INSTRUCTIONDETAIL.md`
9. `INSTRUCTIONS_SUBSYSTEM.md`
10. `LAZY.md`
11. `MAIN.md`
12. `RAGCONFIGSECTION.md`
13. `RAG_SUBSYSTEM.md`
14. `SUBSYSTEMS.md`
15. `TEMPLATES_SUBSYSTEM.md`
16. `TEMPLATE_MANAGER.md`
17. `TEMPLATE_ASSET_PICKER.md`
18. `TEMPLATE_EDITOR.md`
19. `TEMPLATE_QUICK_PICKER.md`
20. `UI_COMPONENTS_MAP.md`
21. `USE_CHAT_HOOK.md`

### Archivos Backup (pueden eliminarse si no son necesarios):
22. `FLUXCORE_TEMPLATE_CONFIG_BACKUP.md`
23. `TEMPLATE_MANAGER_BACKUP.md`
24. `TEMPLATE_MANAGER_BACKUP_README.md`
25. `TEMPLATE_ASSET_PICKER_BACKUP.md`
26. `TEMPLATE_QUICK_PICKER_BACKUP.md`

---

## 🚀 Impacto Esperado:

### Antes de Corregir:
- Score: 23.1%
- Errores de formato: 26
- Documentos estables: 2/29 (6.9%)

### Después de Corregir:
- Score: ~80-90% (estimado)
- Errores de formato: 0
- Documentos estables: ~25/29 (86%)

### Mejora en Calidad:
- **+60-70 puntos en score**
- **-26 errores críticos**
- **+80% documentos estables**

---

## ⏱️ Tiempo Estimado:
- **5-10 minutos por documento** si se hace manualmente
- **~2-4 horas total** para los 26 documentos
- **Impacto inmediato** en el score del panel
