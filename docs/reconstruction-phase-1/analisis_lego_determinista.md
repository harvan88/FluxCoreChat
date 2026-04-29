# 🧱 Análisis de Ensamblaje Determinista (El LEGO del Sistema)

Este documento desglosa mecánicamente cómo el Kernel de FluxCore ensambla el prompt de la Fase 3, demostrando el determinismo del sistema sin depender de la Inteligencia Artificial ni de datos contaminados del usuario.

## 🧩 Las Piezas del LEGO Disponibles

El sistema cuenta con las siguientes piezas abstractas (módulos de texto) antes del ensamblaje:

1.  **[Bloque A] Identidad Base (Sistema)**: "Eres el asistente virtual de Dr. Jones..."
2.  **[Bloque B] Contexto Privado (Usuario)**: Las instrucciones que carga el usuario en su perfil (Identidad específica, Voseo, Restricciones, Órdenes de usar plantillas).
3.  **[Bloque C] Directivas de Atención (Sistema)**: Reglas fijas del sistema (Tono neutro, no emojis, idioma).
4.  **[Bloque D] Protocolo de Respuesta (Sistema)**: La instrucción técnica de cómo invocar `CALL_TEMPLATE`.
5.  **[Bloque E] Catálogo de Plantillas (Sistema/Usuario)**: La lista de plantillas que sobrevivieron a la Fase 0.
6.  **[Bloque F] Identidad de Soberanía Ciega (Kernel)**: Un hardcode puro de emergencia ("Eres Ximena, no des precios de cirugía").
7.  **[Bloque G] Directiva Antibucle (Kernel)**: Instrucción estricta de detener la repetición y no usar comandos.

---

## 🟢 ESCENARIO 1: Flujo Coherente (El Ensamblador Activo)

**Condición Determinista:** `isStalled === false` (El Router NO detectó el trigger `0000`).

**Mecánica de Flujo:**
1. El Kernel aprueba el paso hacia el **PromptBuilder** (El ensamblador complejo).
2. Se inyecta la contaminación del usuario (Bloque B) porque se asume que es segura.

**Armado del LEGO (Orden exacto):**
*   `[Bloque A]` + `[Bloque B]` + `[Bloque C]` + `[Bloque D]` + `[Bloque E]`

**Resultado del Prompt (Aislado de IA):**
```markdown
## Identidad
Eres el asistente virtual de Dr. Jones.

Contexto adicional:
### 1. PERFIL Y ROL
Eres Ximena... (Resto de datos del usuario)
### 4. PROTOCOLO DE CONOCIMIENTO
Tu prioridad absoluta es usar plantillas...

## Directivas de Atención
- Tono: neutro y claro

Protocolo de Respuesta:
- Si usas una plantilla: CALL_TEMPLATE: <ID_CORTO>

## Conocimiento y Recursos
- Plantilla 9EB1: Modelado 360...
```

---

## 🚨 ESCENARIO 2: Flujo Incoherente (Soberanía Ciega)

**Condición Determinista:** `isStalled === true` (El Router detectó el trigger `0000`).

**Mecánica de Flujo:**
1. El Kernel **DETIENE** el flujo hacia el PromptBuilder.
2. El ensamblador complejo es ignorado.
3. Se descartan totalmente los Bloques A, B, C, D y E para evitar la "contaminación del usuario" (órdenes contradictorias de usar plantillas).

**Armado del LEGO (Orden exacto):**
*   `[Bloque F]` + `[Bloque G]`

**Resultado del Prompt (Puro y Determinado por el Kernel):**
```markdown
## Identidad
Eres **Ximena**, recepcionista de la Clínica Dr. Jones. Hablás en Español de Argentina (Voseo).

### Restricciones de Negocio
- No des precios de cirugías.
- El costo de la consulta quirúrgica inicial es de $60.000.

⚠️ INSTRUCCIÓN DE MEJORA DE INTERPRETACIÓN (Antibucle):
Se ha detectado que la conversación está estancada. 
1. DETÉN el bucle de repetición.
2. NO uses plantillas ni comandos técnicos (CALL_TEMPLATE).
3. ADMITE que no podés resolver la duda por este medio de forma cordial.
4. OFRECE hablar con un humano o agendar una consulta de evaluación ($60.000).
```

---

## ⚖️ Conclusión del Análisis de Flujo

El sistema ya no depende de inferencias ni de limpiezas mediante expresiones regulares (`regex`) sobre textos sucios del usuario. La bifurcación es **estructural y determinista**:

*   Si hay coherencia, se usa la maquinaría pesada (`PromptBuilder`).
*   Si hay conflicto, se corta la energía a la maquinaria pesada y entra un bloque de contingencia estático y ciego, asegurando que la IA reciba instrucciones perfectas y unívocas.
