# Plan de Reparación UI - FluxCore Chat

**Fecha:** 2024-12-09
**Estado:** EN PROGRESO

## Problemas Identificados

### Críticos (Bloquean funcionalidad)
1. **[BUG-001]** Mensajes de Fluxi no se muestran en ChatView
   - DB tiene mensajes, frontend no los carga
   - Posible: syncManager no hace fetch, o formato de datos incorrecto

2. **[BUG-002]** Usuario aparece como contacto de sí mismo
   - Carlos Test ve a Carlos Test en su lista de contactos
   - Lógica de filtrado incorrecta en relationships/contacts

3. **[BUG-003]** Click en tarjeta de contacto no hace nada
   - No abre perfil ni inicia conversación
   - Handler faltante o incorrecto

4. **[BUG-004]** WebSocket con errores de conexión
   - `ws://localhost:3000/ws` falla intermitentemente
   - Reconexión funciona pero genera errores en consola

### Moderados (Afectan UX)
5. **[BUG-005]** Contacto agregado hace parpadeo
   - UI no actualiza correctamente al agregar contacto
   - Posible re-render innecesario

6. **[BUG-006]** Nombre de conversación inconsistente
   - A veces muestra ID, a veces nombre

---

## Hitos de Reparación

### Hito R1: Auditoría de Endpoints (30 min)
- [ ] Verificar `/conversations/:id/messages` devuelve datos correctos
- [ ] Verificar `/relationships` no incluye self-relationships
- [ ] Verificar `/contacts` filtra correctamente
- [ ] Verificar `/ws` endpoint WebSocket funciona
- [ ] Documentar discrepancias encontradas

### Hito R2: Corrección de Datos (30 min)
- [ ] Limpiar self-relationships en DB si existen
- [ ] Verificar que mensajes de Fluxi tienen formato correcto
- [ ] Asegurar que content es JSON válido, no string escapado

### Hito R3: Sincronización Frontend-Backend (1 hora)
- [ ] Auditar `syncManager.fetchMessages()` - verificar que parsea correctamente
- [ ] Auditar `useOfflineMessages` - verificar que devuelve mensajes
- [ ] Añadir logs de debug para trazar flujo de datos
- [ ] Corregir parsing de `content` si está mal formateado

### Hito R4: Lista de Contactos (1 hora)
- [ ] Auditar `ContactsList.tsx` - verificar handler de click
- [ ] Implementar apertura de perfil al hacer click
- [ ] Filtrar usuario actual de la lista de contactos
- [ ] Corregir parpadeo al agregar contacto

### Hito R5: WebSocket Estabilidad (30 min)
- [ ] Revisar `useWebSocket.ts` - mejorar manejo de errores
- [ ] Implementar backoff exponencial en reconexión
- [ ] Silenciar errores esperados durante reconexión

### Hito R6: Validación TOTEM (1 hora)
- [ ] Verificar que UI sigue contrato canónico
- [ ] Auditar flujos: Sidebar → Tab → Content
- [ ] Verificar colores usan sistema de diseño
- [ ] Documentar desviaciones encontradas

### Hito R7: Tests de Integración (30 min)
- [ ] Crear script de verificación manual
- [ ] Probar flujo completo: login → ver contactos → abrir chat → enviar mensaje
- [ ] Verificar persistencia en IndexedDB
- [ ] Verificar sincronización con PostgreSQL

---

## Orden de Ejecución

1. **R1** - Auditoría (entender estado actual)
2. **R2** - Datos (limpiar base)
3. **R3** - Sync (corregir flujo de mensajes)
4. **R4** - Contactos (corregir interacciones)
5. **R5** - WebSocket (estabilizar conexión)
6. **R6** - TOTEM (validar contrato)
7. **R7** - Tests (verificar todo funciona)

---

## Progreso

| Hito | Estado | Notas |
|------|--------|-------|
| R1 | ⏳ Pendiente | |
| R2 | ⏳ Pendiente | |
| R3 | ⏳ Pendiente | |
| R4 | ⏳ Pendiente | |
| R5 | ⏳ Pendiente | |
| R6 | ⏳ Pendiente | |
| R7 | ⏳ Pendiente | |

