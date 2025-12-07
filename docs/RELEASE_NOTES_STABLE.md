# 📌 Release Notes - Versión Estable Pre-Refactor

**Fecha:** 2024-12-07  
**Commit:** (Este commit)  
**Tag Sugerido:** `v0.2.0-stable`

---

## 🎯 Estado Actual

Este commit marca el **estado estable más reciente** antes de un cambio arquitectónico importante. 
Use este punto como referencia si necesita hacer rollback.

---

## ✅ Funcionalidades Implementadas

### 🔐 Autenticación
- [x] Login con email/password
- [x] Registro de usuarios
- [x] **Mostrar/ocultar contraseña (ojito)**
- [x] **Recuperar contraseña (UI) - Backend TODO**
- [x] JWT tokens
- [x] Sesión persistente

### 💬 Chat
- [x] Cargar mensajes desde API real
- [x] Enviar mensajes con optimistic updates
- [x] WebSocket para mensajes en tiempo real
- [x] Estados de mensaje (pending, sent, delivered, seen, failed)
- [x] Responder a mensaje (reply-to)
- [x] **Eliminar mensajes**
- [x] Reintentar mensajes fallidos
- [x] Input correctamente posicionado

### 🤖 IA (core-ai)
- [x] Sugerencias de IA vía Groq API
- [x] Fallback a mock si no hay API key
- [x] Aprobar/rechazar/regenerar sugerencias
- [x] Pre-instalación automática en nuevas cuentas

### 🧩 Extensiones
- [x] Panel de extensiones en sidebar
- [x] ExtensionConfigPanel para configurar
- [x] Icono en ActivityBar

### 📱 Offline-First
- [x] IndexedDB con Dexie.js
- [x] useChatOffline hook
- [x] Auto-sync al reconectar
- [x] ConnectionIndicator component

---

## ⚠️ Elementos Mock / No Implementados

| Elemento | Estado | Notas |
|----------|--------|-------|
| Llamadas (Phone/Video) | Mock | Solo iconos visuales |
| Emoji picker | Mock | Botón sin funcionalidad |
| Adjuntar archivos | Mock | Botón sin funcionalidad |
| Recuperar contraseña | UI Only | Backend no implementado |
| Notificaciones | No | Pendiente |
| Búsqueda de mensajes | No | Pendiente |

---

## 🔧 CI/CD

- Workflow GitHub Actions mejorado
- Retry loop para inicio de servidor
- Logs de error visibles si falla

---

## 📋 Próximo Cambio Mayor

Este commit precede a un cambio importante. Detalles en la siguiente sesión.

---

## 🏷️ Cómo crear tag

```bash
git tag -a v0.2.0-stable -m "Estado estable pre-refactor"
git push origin v0.2.0-stable
```
