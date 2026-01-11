# Especificación Técnica Consolidada: FluxCore
## Sistema de Gestión de Asistentes de Inteligencia Artificial

---

## PREÁMBULO: PRINCIPIOS ARQUITECTÓNICOS

**FluxCore** es un sistema de orquestación de agentes de IA diseñado bajo principios de:

- **Composición por referencia**: Los asistentes no contienen datos, solo referencian assets
- **Activos centralizados**: Instrucciones, Vector Stores, Tools y Files son entidades independientes
- **Versionado y gobernanza**: Todo asset es versionable y tiene control de acceso
- **Marketplace-ready**: Los assets pueden ser privados, compartidos o públicos (vendibles)
- **Multi-cuenta**: Separación estricta entre ownership y consumo
- **No duplicación**: Un asset existe una sola vez y se referencia múltiples veces

---

## 1. ARQUITECTURA GENERAL DE LA INTERFAZ

### 1.1. Estructura de Tres Columnas

La interfaz de FluxCore se compone de tres áreas principales dispuestas horizontalmente:

#### Columna 1: Activator (Extremo Izquierdo)
- **Elemento:** Icono único de AI
- **Función:** Activador principal del sistema
- **Comportamiento:** Elemento estático y siempre visible

#### Columna 2: Sidebar (Menú de Navegación)
- **Función:** Navegación principal entre módulos del sistema
- **Elementos del Menú:**
  1. **Uso** - Icono: `lucide/chart-no-axes-combined`
  2. **Asistentes** - Icono: `lucide/bot`
  3. **Instrucciones del sistema** - Icono: `lucide/scroll-text`
  4. **Base de conocimiento** - Icono: `lucide/database-zap`
  5. **Herramientas** - Icono: `lucide/wrench`
  6. **Depuración del asistente** - Icono: `lucide/square-chevron-right`
  7. **Facturación** - Icono: `lucide/receipt-text`

#### Columna 3: Área de Trabajo Principal
- **Función:** Espacio dinámico que cambia según la selección del sidebar
- **Estados posibles:**
  - Vista de Inventario (Lista de elementos)
  - Vista de Configuración Detallada (Elemento específico)

### 1.2. Gestión de Pestañas del Navegador

Cada elemento activo actualiza la pestaña del navegador con:
- **Icono:** Correspondiente de la librería Lucide
- **Título:** Nombre dinámico del elemento en revisión

---

## 2. MODELO CONCEPTUAL: ACTIVOS Y REFERENCIAS

### 2.1. Principio Central

**Un Asistente NO contiene datos, solo REFERENCIA assets.**

```
Assistant (entidad de composición)
    ├─→ Instruction (asset independiente, versionado)
    ├─→ VectorStore (asset independiente, compartible)
    ├─→ Tool (asset independiente, configurable)
    └─→ Configuration (parámetros del modelo)
```

### 2.2. Tipos de Activos (Assets)

| Tipo de Asset | Propiedad | Versionado | Compartible | Vendible |
|---------------|-----------|------------|-------------|----------|
| **Instruction** | ✅ Sí | ✅ Sí | ✅ Sí | ✅ Sí |
| **VectorStore** | ✅ Sí | ❌ No* | ✅ Sí | ✅ Sí |
| **Tool** | ✅ Sí | ✅ Sí (schema) | ✅ Sí | ✅ Sí |
| **File** | ✅ Sí | ❌ No | ✅ Sí | ❌ No |

*Los archivos dentro del VectorStore sí tienen versionado implícito por fecha de carga.

### 2.3. Niveles de Visibilidad

Cada asset puede tener uno de estos estados:

- **Private**: Solo el owner puede verlo y usarlo
- **Shared**: Usuarios específicos tienen acceso (lectura o edición)
- **Public**: Cualquier usuario puede verlo y usarlo
- **Marketplace**: Público y disponible para venta/suscripción

---

## 3. PATRÓN DE NAVEGACIÓN UNIVERSAL

Todos los módulos del sistema (Asistentes, Instrucciones, Base de conocimiento, Herramientas) siguen el mismo patrón de interacción:

### 3.1. Vista de Inventario (List View)

**Activación:** Se despliega al hacer clic en cualquier opción del sidebar.

**Componentes:**

1. **Botón de Creación** (Esquina superior derecha)
   - Nomenclatura: "+ Nuevo [tipo de elemento]"
   - Ejemplos:
     - "+ Nuevo asistente"
     - "+ Crear Instrucciones"
     - "+ Nuevo vector store"
     - Botón para acceder a "Tienda de herramientas" (en el caso de Herramientas)

2. **Tabla de Metadatos**
   - **Columnas estándar:**
     - Nombre
     - Visibilidad (Private/Shared/Public/Marketplace)
     - Owner (cuenta propietaria)
     - Estado (Producción/Desactivado)
     - Última modificación (fecha y autor)
     - Versión actual (para assets versionados)
     - Tamaño (tokens/memoria/MB según el tipo)
     - Uso/Consumo (cuántos asistentes lo referencian)

3. **Filtros de Vista**
   - Mis assets (owner = yo)
   - Compartidos conmigo (tengo permiso)
   - Públicos/Marketplace (accesibles a todos)

4. **Interacción de Acceso**
   - **Acción:** Clic sobre cualquier fila de la tabla
   - **Resultado:** Transición a la Vista de Configuración Detallada del elemento seleccionado

### 3.2. Vista de Configuración Detallada

**Activación:** Al seleccionar un elemento de la lista o al crear uno nuevo.

**Estructura vertical en tres zonas:**

#### Zona 1: Encabezado Estático (No Replegable)

**Características:**
- Área persistente y siempre visible
- No puede colapsarse

**Elementos:**

1. **Pre-título de Contextualización**
   - Función: Ubicar al usuario en el tipo de recurso
   - Ejemplos:
     - "Configuración de asistente"
     - "Vector Store"
     - "Instrucciones del sistema"

2. **Nombre del Elemento (Título Principal)**
   - Formato: Tipografía blanca destacada
   - Edición: Campo editable in situ
   - Valor inicial: Nombre por defecto al crear un elemento nuevo
   - **Persistencia automática (Auto-save):**
     - Eventos que disparan el guardado:
       - Presionar tecla `Enter`
       - Pérdida de foco del campo (`Blur`)
     - No requiere botón de "Guardar"

3. **Identificador Único (ID)**
   - Ubicación: Inmediatamente debajo del nombre
   - Formato: Código alfanumérico con prefijo según el tipo
     - Asistentes: `asst_...`
     - Vector Stores: `vs_...`
     - Instructions: `inst_...`
     - Tools: `tool_...`
   - **Funcionalidad Click-to-Copy:**
     - Acción: Clic sobre el ID
     - Resultado: Copiado automático al portapapeles

4. **Metadatos de Ownership y Visibilidad**
   - Owner: Cuenta propietaria del asset
   - Visibilidad: Selector (Private/Shared/Public/Marketplace)
   - Versión actual (si aplica)
   - Creado el: Fecha de creación

#### Zona 2: Secciones Colapsables (Cuerpo de Configuración)

**Comportamiento de Expansión/Repliegue:**
- **Acción:** Clic en el título de la sección
- **Efecto:** Despliega o repliega el contenido interno

**Sistema de Control: Interruptor de "Fuente de Verdad"**

Cada sección incluye un toggle (interruptor) iconográfico ubicado junto al título que controla la lógica de aplicación de valores.

##### Estado OFF (Desactivado)

| Aspecto | Comportamiento |
|---------|----------------|
| **Lógica de Datos** | El sistema aplica la **Configuración por Defecto** (valores globales predefinidos). Los valores personalizados son ignorados. |
| **Apariencia Visual** | Los componentes adquieren un **tono opaco** con contraste reducido, indicando inactividad. |
| **Interacción** | Los controles están **bloqueados** (modo read-only). El usuario no puede interactuar con los campos. |
| **Fuente de Verdad** | Parámetros globales del sistema |

##### Estado ON (Activado)

| Aspecto | Comportamiento |
|---------|----------------|
| **Lógica de Datos** | El sistema toma los **valores personalizados** introducidos por el usuario como única fuente de verdad. |
| **Apariencia Visual** | Los componentes recuperan su **color normal y vívido**, indicando estado activo. |
| **Interacción** | Todos los controles están **habilitados** para edición completa. |
| **Fuente de Verdad** | Configuración del usuario (Override) |

**Ejemplo de Comportamiento:**
- Parámetro con valor por defecto: `5`
- Usuario modifica el valor a: `7`
- Si el interruptor está **OFF**: el sistema opera con valor `5`
- Si el interruptor está **ON**: el sistema opera con valor `7`

#### Zona 3: Barra de Acciones (Footer) - Específica por Módulo

En algunos módulos (ej. Base de conocimiento), existe una sección inferior fija no replegable con acciones críticas.

---

## 4. MÓDULO: ASISTENTES

### 4.1. Identidad Visual
- **Icono:** `lucide/bot`
- **Ubicación:** Sidebar y pestañas del navegador

### 4.2. Arquitectura Conceptual

**Un Asistente es una COMPOSICIÓN de referencias:**

```
Assistant {
  id: "asst_abc123"
  owner_account_id: "acc_xyz789"
  name: "Soporte Técnico v3"
  status: "production"
  
  // REFERENCIAS (no contiene los datos)
  instructions: [
    { instruction_id: "inst_001", order: 1, enabled: true },
    { instruction_id: "inst_002", order: 2, enabled: true }
  ]
  
  vector_stores: [
    { vs_id: "vs_001", access_mode: "read" }
  ]
  
  tools: [
    { tool_id: "tool_calendar", config: {...}, enabled: true }
  ]
  
  // CONFIGURACIÓN DEL MODELO
  provider: "openai"
  model: "gpt-4o"
  temperature: 0.7
  top_p: 0.9
  smart_delay: false
  response_timeout: 30
}
```

### 4.3. Vista de Inventario

**Botón de Creación:** "+ Nuevo asistente"

**Tabla de Metadatos:**
- Nombre
- Visibilidad (Private/Shared/Public)
- Owner
- Instrucciones referenciadas (cantidad)
- Vector Stores referenciados (cantidad)
- Tools activos (cantidad)
- Estado (Producción/Desactivado/Borrador)
- Última modificación (fecha y autor)
- Versión
- Uso (cuántas conversaciones activas)

### 4.4. Vista de Configuración

#### Encabezado Estático
- Pre-título: "Configuración de asistente"
- Nombre editable con auto-save
- ID con formato `asst_...` y funcionalidad click-to-copy
- Owner: Cuenta propietaria
- Visibilidad: Selector (Private/Shared/Public)
- Versión: Si aplica versionado de la composición completa

#### Secciones Colapsables

##### Configuración Inicial

**Instrucciones del Sistema:**
- **Tipo:** Selector multi-referencia (puede tener múltiples instrucciones)
- **Fuente de datos:** Query a la base de datos de Instructions con permisos:
  - Instructions propias (owner = yo)
  - Instructions compartidas conmigo
  - Instructions públicas/marketplace
- **Vista de lista:**
  - Cada instrucción seleccionada muestra:
    - Nombre
    - ID
    - Owner (si no es mío)
    - Versión actual
    - Habilitado (toggle on/off)
    - Orden (drag & drop para reordenar)
- **Acción adicional:** Botón al final: "Crear nueva Instrucción"
- **Flujo:** Permite crear nuevas instrucciones sin abandonar la configuración actual
- **Arquitectura:** Se crea una referencia en `AssistantInstruction`, NO se duplica el contenido

**Base de Conocimiento (Vector Store):**
- **Tipo:** Selector multi-referencia
- **Fuente de datos:** Query a VectorStores accesibles (propios, compartidos, públicos)
- **Vista de lista:**
  - Cada Vector Store seleccionado muestra:
    - Nombre
    - ID
    - Owner (si no es mío)
    - Tamaño
    - Modo de acceso (read/write)
    - Habilitado (toggle on/off)
- **Acción adicional:** Botón: "Crear nuevo Vector Store"
- **Arquitectura:** Se crea referencia en `AssistantVectorStore`, NO se duplican archivos

##### Proveedor IA

**Empresa Proveedora:**
- Selector de plataforma (ej. OpenAI, Anthropic, Google)

**Modelo:**
- Selector dependiente del proveedor seleccionado
- La lista se filtra dinámicamente según la plataforma elegida
- Ejemplos: GPT-4o, Claude Sonnet 4, Gemini Pro

##### Tiempo de Respuesta

**IMPORTANTE: Exclusividad Mutua**

Los siguientes parámetros NO pueden estar activos simultáneamente:

1. **Smart Delay** (Algoritmo inteligente)
   - **Cuando está ON:** Desactiva automáticamente "Segundos de espera"
   - **Función:** Gestión automatizada del tiempo de respuesta

2. **Segundos de espera** (Control manual)
   - **Cuando está ON:** Smart Delay debe estar desactivado
   - **Función:** Ajuste manual en segundos

**Razón de la exclusividad:** Evitar conflictos en la lógica de procesamiento de respuestas.

##### Configuración de Modelo

**Temperature:**
- **Tipo:** Slider (barra deslizante)
- **Rango:** 0 a 1 (con precisión decimal)
- **Función:** Control de aleatoriedad
  - Valores cercanos a **0**: Respuestas deterministas y precisas
  - Valores cercanos a **1**: Respuestas creativas y variables

**Top P:**
- **Tipo:** Slider (barra deslizante)
- **Rango:** 0 a 1
- **Función:** Nucleus Sampling
- **Descripción:** Determina el porcentaje de la masa de probabilidad considerada para elegir la siguiente palabra, filtrando respuestas irrelevantes

##### Tools (Herramientas)

**Tipo:** Selector multi-referencia de tools disponibles

**Lista de Tools activos:**
- Cada tool muestra:
  - Nombre
  - Tipo (MCP/HTTP/Internal)
  - Owner (si no es mío)
  - Habilitado (toggle on/off)
  - Configuración específica (JSON o formulario)

**Acción:** Botón "Agregar Tool" (abre selector o marketplace)

**Arquitectura:** Se crea referencia en `AssistantTool` con configuración específica

---

## 5. MÓDULO: INSTRUCCIONES DEL SISTEMA

### 5.1. Identidad Visual
- **Icono:** `lucide/scroll-text`
- **Ubicación:** Sidebar y pestañas del navegador

### 5.2. Arquitectura Conceptual

**Una Instruction es un ASSET versionado independiente:**

```
Instruction {
  id: "inst_abc123"
  owner_account_id: "acc_xyz789"
  name: "Instructor de Python"
  visibility: "public"
  current_version_id: "ver_003"
  created_at: "2025-01-01"
  
  versions: [
    { id: "ver_001", content: "...", created_at: "2025-01-01" },
    { id: "ver_002", content: "...", created_at: "2025-01-05" },
    { id: "ver_003", content: "...", created_at: "2025-01-10" } // ACTUAL
  ]
}

// Uso de esta instruction
AssistantInstruction {
  assistant_id: "asst_001"
  instruction_id: "inst_abc123"
  version_id: "ver_003" // Puede fijar una versión específica
  order: 1
  enabled: true
}
```

### 5.3. Vista de Inventario

**Botón de Creación:** "+ Crear Instrucciones"

**Filtros de vista:**
- Mis instrucciones
- Compartidas conmigo
- Públicas
- Marketplace

**Tabla de Metadatos:**
- Nombre
- Visibilidad (Private/Shared/Public/Marketplace)
- Owner
- Versión actual
- Usado en (cantidad de asistentes que la referencian)
- Última modificación
- Tamaño (tokens/caracteres)

**Acciones por Elemento:**
- **Compartir:** Otorgar permisos de lectura o edición a cuentas específicas
- **Publicar:** Cambiar visibilidad a Public o Marketplace
- **Duplicar:** Crear una copia propia (fork)
- **Historial:** Ver todas las versiones
- **Descargar:** Exportar la instrucción
- **Eliminar:** Solo si el usuario es owner y no está siendo usada

### 5.4. Vista de Configuración (Editor)

#### Encabezado Estático
- Pre-título: "Instrucciones del sistema"
- Nombre editable con auto-save
- ID con formato `inst_...` y click-to-copy
- Owner
- Visibilidad: Selector (Private/Shared/Public/Marketplace)
- Versión actual + selector de versiones históricas
- Usado en: Lista de asistentes que referencian esta instrucción

#### Sección: Control de Versiones

**Versión actual:**
- Número de versión
- Fecha de creación
- Autor
- Botón: "Ver historial de versiones"

**Crear nueva versión:**
- Al guardar cambios significativos, se crea automáticamente una nueva versión
- Las versiones anteriores se mantienen disponibles
- Los asistentes pueden fijar una versión específica o usar siempre la última

#### Área de Trabajo: Editor de Contenido
- **Componente:** Text-area de gran escala con editor enriquecido
- **Función:** Redacción de directrices de comportamiento y tono para el asistente
- **Características:**
  - Syntax highlighting para Markdown
  - Soporte para visualización de código
  - Conteo de tokens en tiempo real
  - Preview del contenido renderizado

**Persistencia:**
- Botón "Guardar cambios" (crea nueva versión)
- Opción: "Guardar como borrador" (no crea versión)

#### Sección: Permisos y Compartir

**Permisos específicos:**
- Lista de cuentas con acceso
- Nivel de permiso por cuenta:
  - **Lectura**: Puede ver y usar la instruction
  - **Edición**: Puede modificar y crear versiones
  - **Administración**: Puede cambiar permisos

**Agregar permiso:**
- Selector de cuenta/usuario
- Selector de nivel de permiso
- Botón "Otorgar acceso"

#### Sección: Marketplace (si visibility = Marketplace)

**Configuración de venta:**
- Precio (único o suscripción)
- Descripción de marketplace
- Tags/categorías
- Licencia de uso

---

## 6. MÓDULO: BASE DE CONOCIMIENTO (VECTOR STORE)

### 6.1. Identidad Visual
- **Icono:** `lucide/database-zap` (color naranja)
- **Ubicación:** Sidebar y pestañas del navegador

### 6.2. Arquitectura Conceptual

**Un VectorStore es un ASSET compartible que contiene archivos:**

```
VectorStore {
  id: "vs_abc123"
  owner_account_id: "acc_xyz789"
  name: "Documentación Técnica 2025"
  visibility: "shared"
  purpose: "Soporte técnico"
  expiration_policy: "30_days"
  created_at: "2025-01-01"
  
  files: [
    { file_id: "file_001", added_at: "2025-01-01" },
    { file_id: "file_002", added_at: "2025-01-05" }
  ]
}

// Uso de este vector store
AssistantVectorStore {
  assistant_id: "asst_001"
  vector_store_id: "vs_abc123"
  access_mode: "read"
}

// Los archivos son activos independientes
File {
  id: "file_001"
  owner_account_id: "acc_xyz789"
  storage_ref: "s3://bucket/path"
  mime_type: "application/pdf"
  size: 2048576
  created_at: "2025-01-01"
}
```

### 6.3. Vista de Inventario

**Botón de Creación:** "+ Nuevo vector store"

**Filtros:**
- Mis vector stores
- Compartidos conmigo
- Públicos

**Tabla de Metadatos:**
- Nombre del vector
- Visibilidad (Private/Shared/Public)
- Owner
- Asistentes vinculados (cantidad)
- Archivos (cantidad)
- Última modificación
- Tamaño total (MB)
- Política de Expiración
- Uso estimado (costo)

### 6.4. Vista de Configuración

#### Encabezado Estático
- Pre-título: "Vector Store"
- Nombre editable con auto-save
- ID con formato `vs_...` y click-to-copy
- Owner
- Visibilidad: Selector (Private/Shared/Public)

#### Secciones Colapsables

##### Detalles
- Fecha de creación
- Tamaño actual (MB)
- Cantidad de archivos
- Uso estimado (horas acumuladas, costo por GB/día)
- Purpose/Descripción

##### Configuración

**Política de Expiración:**
- Opciones:
  - "Nunca"
  - "30 días después de activado"
  - "60 días"
  - "90 días"
  - Fecha específica (selector de calendario)
- **Función:** Optimización de costos y cumplimiento de privacidad

##### Archivos Adjuntos

**Lista de Documentos:**
- Tabla con archivos del vector store
- Columnas:
  - Nombre del archivo
  - Tipo (PDF, DOCX, TXT, etc.)
  - Tamaño
  - Fecha de carga
  - Estado de indexación
  - Acción: Eliminar (solo si owner)

**Nota:** Los archivos son referencias a `File` entities independientes

##### Usado en (Asistentes)
- Lista de asistentes que referencian este Vector Store
- Muestra:
  - Nombre del asistente
  - Owner (si es diferente)
  - Modo de acceso (read/write)

##### Permisos y Compartir

**Permisos específicos:**
- Lista de cuentas con acceso al vector store
- Nivel de permiso:
  - **Lectura**: Puede usar el VS en sus asistentes
  - **Edición**: Puede agregar/eliminar archivos
  - **Administración**: Puede cambiar permisos

#### Barra de Acciones Fijas (Footer No Replegable)

**Ubicación:** Parte inferior del panel

**Botones disponibles:**

1. **Eliminar Vector Store**
   - Color: Rojo
   - Icono: Papelera
   - Validación: Solo si owner y no está siendo usado
   - Confirmación: Modal con advertencia

2. **+ Agregar Archivo**
   - Función: Subir nuevos documentos
   - Flujo:
     1. Selector de archivos (drag & drop o explorador)
     2. Carga a storage (S3/equivalente)
     3. Creación de registro `File`
     4. Creación de referencia `VectorStoreFile`
     5. Indexación asíncrona
   - Feedback: Barra de progreso y estado de indexación

---

## 7. MÓDULO: HERRAMIENTAS (TOOLS)

### 7.1. Identidad Visual
- **Icono:** `lucide/wrench`
- **Ubicación:** Sidebar y pestañas del navegador

### 7.2. Arquitectura Conceptual

**Un Tool es un ASSET que define una capacidad ejecutable:**

```
Tool {
  id: "tool_abc123"
  owner_account_id: "acc_xyz789" // O "system" para tools nativos
  name: "Google Calendar Integration"
  description: "..."
  type: "mcp" | "http" | "internal"
  visibility: "public"
  status: "active"
  
  schema: {
    id: "schema_001"
    schema_json: { /* OpenAPI / JSON Schema */ }
    version: "1.0.0"
    strict: true
  }
}

// Uso de este tool
AssistantTool {
  assistant_id: "asst_001"
  tool_id: "tool_abc123"
  config_json: { /* API keys, endpoints, etc */ }
  enabled: true
}
```

### 7.3. Tipología de Herramientas

#### Herramientas del Sistema (Nativas)
- Owner: `system`
- Ejemplos: Smart Delay, Retriever, Code Interpreter
- No se pueden eliminar
- Pueden tener configuración específica

#### Herramientas de Terceros (Integraciones)
- Owner: `system` o cuenta corporativa
- Ejemplos: Google Calendar, Slack, GitHub
- Requieren autenticación/API keys

#### Herramientas Personalizadas
- Owner: Cuenta del usuario
- Pueden ser privadas, compartidas o públicas
- Vendibles en marketplace

### 7.4. Vista de Inventario

**Botones de Acción:**
- "+ Crear Tool personalizado"
- "🛒 Ir a Tienda de herramientas" (Tool Marketplace)

**Filtros:**
- Mis tools
- Tools del sistema
- Compartidos conmigo
- Públicos/Marketplace

**Tabla de Metadatos:**
- Nombre
- Tipo (MCP/HTTP/Internal)
- Visibilidad
- Owner
- Usado en (cantidad de asistentes)
- Estado (Activo/Inactivo/Deprecated)
- Versión del schema

### 7.5. Vista de Configuración

#### Encabezado Estático
- Pre-título: "Tool"
- Nombre editable (si owner)
- ID con formato `tool_...` y click-to-copy
- Owner
- Visibilidad: Selector (Private/Shared/Public/Marketplace)
- Tipo: MCP/HTTP/Internal

#### Secciones Colapsables

##### Detalles
- Descripción completa
- Tipo de ejecución
- Versión actual
- Usado en (lista de asistentes)

##### Schema (Definición de la Herramienta)

**Para tools custom:**
- Editor JSON para OpenAPI/JSON Schema
- Validación en tiempo real
- Versioning del schema

**Para tools de terceros:**
- Schema read-only (no editable)
- Documentación de uso

##### Configuración por Defecto

**Parámetros globales del tool:**
- Timeout
- Rate limits
- Retry policy

##### Autenticación (si aplica)

**Para integraciones externas:**
- Tipo de auth (API Key, OAuth2, JWT)
- Campos de configuración
- Botón "Conectar cuenta"

---

## 8. GLOSARIO TÉCNICO DE PARÁMETROS

| Parámetro | Definición Técnica |
|-----------|-------------------|
| **Asset** | Entidad independiente que puede ser compartida, versionada y reutilizada. Incluye: Instructions, VectorStores, Tools, Files. |
| **Referencia** | Relación entre un Assistant y un Asset. El Assistant no contiene el Asset, solo lo referencia por ID. |
| **Owner** | Cuenta (Account) propietaria de un asset. Tiene control total sobre el mismo. |
| **Visibility** | Nivel de acceso de un asset: Private (solo owner), Shared (permisos específicos), Public (accesible a todos), Marketplace (vendible). |
| **Versionado** | Sistema que mantiene historial de cambios en un asset. Permite rollback y fijar versiones específicas. |
| **Composición** | Patrón arquitectónico donde un Assistant se construye ensamblando referencias a assets independientes. |
| **Auto-save** | Persistencia asíncrona automática al detectar eventos `Enter` o `Blur`. |
| **Temperature** | Control de aleatoriedad en generación de texto (0 = determinista, 1 = creativo). |
| **Top P** | Nucleus Sampling: porcentaje de masa de probabilidad considerada. |
| **Smart Delay** | Algoritmo de gestión automática de tiempos de respuesta. |
| **Vector Store** | Repositorio de datos indexados vectorialmente para búsqueda semántica (RAG). |
| **System Instructions**