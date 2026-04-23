# Proyección Forense: Paradigma Cerebro/Cuerpo (Refactor V12)
**ID de Mensaje: 14639 | Caso: Tratamiento de Labios**

Este documento ilustra la separación de responsabilidades entre la **Cognición (FluxCore)** y la **Realidad Física (ChatCore)**.

---

### 🧠 [CEREBRO - FLUXCORE] Fase de Cognición

#### 1. Evaluación Inicial y Tamiz (Fase 0)
- **Estado**: Se identifican plantillas autorizadas.
- **Top 10 Sieve**: `6e...f8` (Estética) puntea alto.

#### 2. Enmascaramiento Determinista (0-2 + -2)
- El sistema TS genera la máscara: `6e99c5...2af8` ➔ **MaskID: 6ef8**.

#### 3. Ruteo de Intención (Fase 1)
- **IA**: Analiza el historial. Selecciona la máscara `6ef8`.
- **Output**: `{"plantillas": ["6ef8"]}`.

#### 4. Orquestación y Guardias (TS)
- **Cerebro** recupera el contenido real de `6ef8`.
- **Chequeo**: ¿Es única y sin variables? ➔ **SÍ**.
- **Acción**: Emitir comando de envío directo.

---

### 🚀 [BYPASS DE EMISIÓN]
*Al no requerir variables ni orquestación de redacción, el cerebro emite la orden declarativa de inmediato.*

- **Emisión FluxCore**:
```json
[
  {
    "type": "send_template",
    "templateId": "6e99c533-623c-4092-a650-175bc2625af8",
    "variables": {}
  }
]
```

---

### 🛡️ [KERNEL - ACTION EXECUTOR] El Puente
*El Kernel recibe la lista de acciones emitida por FluxCore.*
1. **Validación**: ¿La cuenta tiene permiso para enviar este UUID? ➔ **SÍ**.
2. **Notificación**: El Kernel notifica a **ChatCore** que debe hacerse cargo del envío.

---

### 📱 [CUERPO - CHATCORE] Dueño de la Realidad
*ChatCore toma la orden y la ejecuta en el mundo físico.*
1. **Renderizado**: Aplica estilos y variables (vacías en este caso).
2. **Entrega**: Envía el payload a la API de WhatsApp/WebChat.
3. **Persistencia**: Registra el mensaje enviado en la tabla `messages`.

---

### Resumen del Refactor V12
- **Ahorro de Tokens**: El cerebro no tuvo que "redactar" ni "razonar" la entrega.
- **Determinismo**: El bypass garantiza que si una plantilla no tiene `{{ }}`, ChatCore recibirá la orden exacta sin errores de alucinación del modelo.
- **Limpieza**: Se eliminan 1000 tokens de reglas obsoletas en la Fase 3.
