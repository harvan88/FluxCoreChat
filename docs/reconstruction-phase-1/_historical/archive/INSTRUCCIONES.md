Actualizacion importante de Patrón de Transición de Hitos Estructurado (HTP) si en el desarrollo de los hitos en el analisis surge la necesidad de amplir los hitos o modificar alguno incluirlo EXECUTION_PLAN.md hacerlo directamente, e incluirlos en el documento instrucciones. los hitos son vivo y se adaptan con el analisis de codigo y las pruebas.

# INSTRUCCIONES PARA IA DE DESARROLLO
> **Objetivo:** Preparar FluxCore para la primera prueba de producción real
> **Documento de referencia:** `PRUEBAD DE PRODUCION.md`

---

## 🎯 MISIÓN ACTUAL (2024-12-09)

### Estado: ✅ SISTEMA FUNCIONAL - LISTO PARA PRUEBAS

### Hitos COMPLETADOS HOY (2024-12-09):

1. **Hito 20:** Infraestructura de Base de Datos 
   - [x] Crear script de seed para usuarios de prueba (seed-test-users.ts)
   - [x] PostgreSQL corriendo via Docker (fluxcore-db)
   - [x] Migraciones ejecutadas

2. **Hito 21:** Backend Endpoints 
   - [x] Implementar GET /conversations
   - [x] Implementar GET /accounts/search?q=@alias
   - [x] Corregir loop infinito de WebSocket

3. **Hito 22:** Limpieza de UI 
   - [x] Eliminar datos residuales ("Juan Pérez" en tabs)
   - [x] Eliminar simulación de IA mock
   - [x] Settings funciona en Sidebar con navegación interna

4. **Hito 23:** Prueba de Producción "Panadería" - EN CURSO
   - [x] Sistema listo para registro de Carlos
   - [ ] Crear cuenta de negocio
   - [ ] Invitar colaboradores María y Daniel

5. **Hito 24:** Emparejamiento Frontend-Backend 
   - [x] Búsqueda de contactos conectada a API real
   - [x] Modal "Agregar contacto" funcional
   - [x] Endpoint POST /accounts/:id/convert-to-business
   - [x] Frontend usa endpoints reales

6. **Hito 25:** Arquitectura Settings Canónica 
   - [x] SettingsMenu en Sidebar (solo menú)
   - [x] Opciones abren tabs en DynamicContainer
   - [x] ProfileSection como tab
   - [x] AccountsSection como tab

### Arquitectura Corregida:
```
ANTES (incorrecto): ActivityBar → Sidebar (renderiza TODO)
AHORA (canónico):   ActivityBar → Sidebar (MENÚ) → DynamicContainer (CONTENIDO)
```

### Hitos YA COMPLETADOS:
- Hito 16: Profile System (UI lista, requiere BD)
- Hito 17: Account Management (UI lista, requiere BD)
- Hito 18: Workspace & Collaborators (UI lista, requiere BD)
- Hito 19: Welcome Experience (UI lista)
- ✅ Hito 18: Workspace & Collaborators (UI lista, requiere BD)
- ✅ Hito 19: Welcome Experience (UI lista)

---

## 📋 Patrón de Transición de Hitos Estructurado (HTP)

**Filosofía:** "Nada se da por terminado hasta que esté verificado, documentado y probable."

## Estructura del Patrón (Template Universal)
### PARA AVANZAR DEL HITO [X] AL HITO [Y]:
**CIERRE DEL HITO ACTUAL ([X]):**
- Verifique que **todas las pruebas definidas para [X]** hayan sido ejecutadas y aprobadas
- Confirme el cumplimiento **total** de sus criterios de aceptación
- Actualice `docs/ESTADO_PROYECTO.md` con:
  ```markdown
  ### Hito [X] - FECHA_CIERRE
  ✅ Pruebas completadas: [N]/[N]
  ✅ Errores resueltos: [lista_ids]
  ✅ Documentación actualizada
  ```

**INICIO DEL NUEVO HITO ([Y]):**
1. Una vez validado [X], proceda a ejecutar **las tareas específicas del Hito [Y]**
2. Genere entorno de pruebas específico para [Y]:
   ```bash
   bun run test:hito_[Y] --env=testing
   ```

**CRITERIOS DE FINALIZACIÓN PARA [Y]:**
El hito se considerará completado cuando se cumpla **AL MENOS**:
- ✅ Implementación Funcional: Código/feature completo
- ✅ Pruebas Exitosas: Unitarias, integración y funcionales aprobadas
- ✅ Errores Resueltos: Issues cerrados (referenciar IDs)
- ✅ Documentación Actualizada
- ✅ Se actualiza y depura información en archivos de documentación (mantener limpieza sin perder contexto)
- ✅ Guía de Verificación: Lista numerada para pruebas manuales (si aplica)
- ✅ Limpieza de Contexto

---

## Protocolo Post-Hito
Al finalizar un hito, la IA DEBE:
1. ✅ Evaluar y decidir autónomamente el siguiente hito según:
2. ✅ Commitear cambios con mensaje estructurado:
3. ✅ He terminado el hito ¿debo consultar con cual seguir? No sería un error, inmedaitamente debo continuar con el siguiente hito. 
3. ✅ Inmediatamente comenzar ejecución del siguiente hito usando HTP

---

## Información para Hito WhatsApp Adapter
### Configuración Webhook Meta (Oficial):
```bash
# 1. Registrar aplicación en Meta Developers
curl -X POST https://graph.facebook.com/v19.0/APP_ID/subscriptions \
  -d "access_token=TOKEN" \
  -d "object=whatsapp_business_account" \
  -d "callback_url=https://yourdomain.com/webhook" \
  -d "fields=message_template_status_update,messages"

# 2. Configurar token de verificación
VERIFICATION_TOKEN="fluxcore_$(date +%s | sha256sum | base64 | head -c 16)"
```

### Enviar mensajes (API Oficial):
Si es necesario hacerlo desde el entorno de Meta, proporcionar información para hacerlo. 
```bash
curl -i -X POST \
  https://graph.facebook.com/v22.0/{{Phone-Number-ID}}/messages \
  -H "Authorization: Bearer {{Token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "{{Recipient-Phone-Number}}",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": { "code": "en_US" }
    }
  }'
```

### Configuración Adapter FluxCore:

```env
META_API_VERSION="v22.0"
META_PHONE_ID="829780113561490"
WEBHOOK_VERIFY_TOKEN="fluxcore_secure_token"
```

---

## 🔧 Reglas de Desarrollo (OBLIGATORIAS)

### Usar Component Library Existente
```typescript
// ✅ CORRECTO - Usar componentes de ui/
import { Button, Input, Card, Badge } from '../components/ui';

// ❌ INCORRECTO - HTML arbitrario
<button className="bg-blue-500">Click</button>
```

### Usar Sistema de Colores Canónico
```typescript
// ✅ CORRECTO - Clases canónicas
className="bg-surface text-primary border-subtle"

// ❌ INCORRECTO - Colores hardcodeados
className="bg-gray-800 text-white border-gray-600"
```

### Conectar a API Real (NO MOCKS)
```typescript
// ✅ CORRECTO - API real
const { data } = await api.get('/accounts');

// ❌ INCORRECTO - Datos mock
const accounts = [{ id: '1', name: 'Mock' }];
```

### Estructura de Archivos
```
apps/web/src/
├── components/
│   ├── settings/      # ProfileSection, AIContextEditor
│   ├── accounts/      # AccountSwitcher, ConvertToBusiness
│   ├── workspace/     # CollaboratorsList, InviteCollaborator
│   └── ui/            # Componentes base (ya existen)
├── hooks/
│   ├── useProfile.ts
│   ├── useAccounts.ts
│   ├── useWorkspaces.ts
│   └── useInvitations.ts
├── store/
│   ├── accountStore.ts
│   └── workspaceStore.ts
└── services/
    ├── accounts.ts
    └── workspaces.ts
```

---

## 📝 Formato de Commits

```bash
# Para cada issue completado:
git commit -am "feat(FC-XXX): [descripción breve]"

# Para cierre de hito:
git commit -am "milestone: Hito [N] completado - [nombre]"
```

---

## 🚀 Flujo de Trabajo HTP

```mermaid
flowchart LR
    A[Verificar Hito X] --> B[Documentar Cierre]
    B --> C[Configurar Entorno Y]
    C --> D[Ejecutar Tareas Y]
    D --> E[Validar Criterios]
    E --> F[Commit Autónomo]
    F --> G[Iniciar Siguiente Hito]
```

---

## ⚠️ IMPORTANTE

1. **NO preguntar** qué hito seguir - continuar automáticamente con el siguiente
2. **NO crear mocks** - todo debe conectar con la API real
3. **NO usar colores hardcodeados** - usar sistema canónico
4. **SIEMPRE** usar componentes de Component Library
5. **SIEMPRE** actualizar documentación al cerrar hito
6. **SIEMPRE** commitear al finalizar cada issue

---

## 🗄️ CONFIGURACIÓN DE BASE DE DATOS

### Requisitos
1. PostgreSQL instalado y corriendo en puerto 5432
2. Base de datos `fluxcore` creada

### Pasos de Configuración

```bash
# 1. Crear archivo .env en la raíz del proyecto
cp .env.example .env

# 2. Configurar DATABASE_URL en .env
DATABASE_URL=postgresql://postgres:password@localhost:5432/fluxcore

# 3. Ejecutar migraciones
cd packages/db
bun run db:migrate

# 4. Crear usuarios de prueba
bun run seed:test
```

### Usuarios de Prueba Creados
| Email | Contraseña | Alias |
|-------|------------|-------|
| fluxcore@test.com | 123456 | @fluxcore |
| maria@test.com | 123456 | @maria |
| daniel@test.com | 123456 | @daniel |

---

**Siguiente acción:**  
Verificar PostgreSQL corriendo → Ejecutar migraciones → Seed usuarios → Probar flujo completo