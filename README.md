# FluxCore

> Sistema de mensajería universal, extensible mediante plugins externos, con IA disponible como extensión por defecto.

## 🚀 Visión

FluxCore es como **WhatsApp + Shopify**:
- El **núcleo** es WhatsApp: chat limpio, estable, universal
- Las **extensiones** son como apps de Shopify: funcionalidad ilimitada encima

## 📋 Documentación

- [TOTEM.md](./TOTEM.md) - Documento fundacional (arquitectura y visión)
- [EXECUTION_PLAN.md](./EXECUTION_PLAN.md) - Plan técnico de implementación
- [GIT_COMMIT_PLAN.md](./GIT_COMMIT_PLAN.md) - Estrategia de commits y branches

## 🏗️ Estructura del Monorepo

```
fluxcore/
├── apps/
│   ├── api/          # Backend Elysia
│   └── web/          # Frontend React
├── packages/
│   ├── types/        # Tipos TypeScript compartidos
│   ├── db/           # Schema Drizzle + migrations
│   └── core/         # Lógica compartida
└── extensions/       # Extensiones oficiales
    ├── fluxcore/      # IA por defecto (preinstalada)
    └── appointments/ # Sistema de turnos
```

## Stack Tecnológico

- **Runtime**: Bun
- **Backend**: Elysia
- **Frontend**: Vite + React + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Build**: Turbo (monorepo)
- **Styling**: TailwindCSS
- **IA**: Groq (gratis)

## 🚦 Inicio Rápido

### Prerrequisitos

- Bun >= 1.0.0
- PostgreSQL >= 14
- Node.js >= 18 (para compatibilidad de herramientas)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/harvan88/FluxCoreChat.git
cd FluxCoreChat

# Instalar dependencias
bun install

# Configurar variables de entorno
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Ejecutar migraciones
bun run db:migrate

# Iniciar en modo desarrollo
bun run dev
```

## 📦 Comandos Disponibles

```bash
bun run dev      # Inicia todos los servicios en modo desarrollo
bun run build    # Construye todos los paquetes
bun run lint     # Ejecuta linters
bun run test     # Ejecuta tests
bun run clean    # Limpia node_modules y builds
```

## 🎯 Principios Inmutables

1. **El núcleo es sagrado** - No se modifica para casos específicos
2. **Núcleo agnóstico a IA** - La IA es una extensión, no parte del núcleo
3. **Gratuito por defecto** - Chat + IA básica gratis
4. **Separación persona/cuenta** - Una persona puede tener múltiples identidades
5. **Contactos ≠ Conversaciones** - Puedo tener 1000 contactos, 10 chats activos
6. **Contexto limitado por diseño** - 5000 chars por cuenta, 2000 chars por relación

## 🔌 Sistema de Extensiones

Las extensiones pueden:
- Registrar tools para IA
- Agregar endpoints propios
- Tener su propia base de datos
- Enriquecer mensajes
- Agregar UI en el workspace

Ver [documentación de extensiones](./docs/extensions.md) para más detalles.

## 📊 Estado del Proyecto

**Versión actual**: 0.10.0 (Producción Ready)

| Hito | Nombre | Estado | Pruebas |
|------|--------|--------|---------|
| 0 | Bootstrap del Monorepo | ✅ | N/A |
| 1 | Fundamentos de Identidad | ✅ | ✅ |
| 2 | Chat Core | ✅ | ✅ 8/8 |
| 3 | Workspace UI | ✅ | ✅ |
| 4 | Sistema de Extensiones | ✅ | ✅ 11/11 |
| 5 | @fluxcore/fluxcore | ✅ | ✅ 12/12 |
| 6 | Contexto Relacional | ✅ | ✅ 16/16 |
| 7 | Extensión de Turnos | ✅ | ✅ 12/12 |
| 8 | Adaptadores (WhatsApp) | ✅ | ✅ 8/8 |
| 9 | Workspaces Colaborativos | ✅ | ✅ 16/16 |
| 10 | Producción Ready | ✅ | ✅ 83/83 |

**Total de pruebas**: 83/83 ✅

Ver [EXECUTION_PLAN.md](./EXECUTION_PLAN.md) para el roadmap completo.

## 🤝 Contribuir

Este proyecto sigue [Conventional Commits](https://www.conventionalcommits.org/).

Ver [GIT_COMMIT_PLAN.md](./GIT_COMMIT_PLAN.md) para la estrategia de commits.

## 📄 Licencia

[MIT License](./LICENSE)

## 👥 Equipo

Desarrollado por el equipo de FluxCore.

---

**¿Preguntas?** Revisa el [TOTEM.md](./TOTEM.md) primero - es la fuente de verdad.
