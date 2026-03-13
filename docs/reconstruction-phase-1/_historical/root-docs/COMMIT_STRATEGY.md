# Estrategia de Commits para FluxCore

Este documento describe cómo ordenar los cambios actuales y mantener controlado el historial de Git.

## 1. Estado actual del árbol de trabajo
- Rama `main` va **25 commits por delante** de `origin/main` (`git status -sb`).
- Cambios mezclan ajustes de **configuración (.env, package.json)**, **backend (apps/api, services, rutas)**, **frontend (apps/web, componentes FluxCore, UI)**, **migraciones de base de datos** y **documentación**.
- Existen múltiples archivos nuevos (`apps/web/src/components/fluxcore`, `packages/db/src/schema/*`, etc.).

## 2. Principios para mantener el control
1. **Agrupa por responsabilidad**: cada commit debe resolver un tema claro (p.ej., “FluxCore UI refresh” o “DB schema for instructions”).
2. **Usa staging selectivo** (`git add -p` o `git add <file>`). Evita “add .” salvo al cerrar un tema pequeño.
3. **Valida antes de cada commit**: `bun run lint`, `bun run test` o comandos específicos según el área tocada.
4. **Documenta en el mensaje**: resume el objetivo + impacto (qué y por qué). Ejemplo: `feat(api): add smart-delay service for assistants`.
5. **Sincroniza con remoto después de validar**. Mantén `main` limpio y usa ramas si se abre un trabajo largo.

## 3. Plan de commits sugerido
| Orden | Alcance | Archivos clave | Notas |
| --- | --- | --- | --- |
| 1 | **Infra/configuración** | `.env`, `.env.example`, `package.json`, `QUICK_START.md`, `docs/ESTADO_PROYECTO.md`, scripts | Garantiza que cualquiera pueda levantar el entorno siguiendo QUICK_START. Explica en el mensaje los cambios de pasos o dependencias. |
| 2 | **Base de datos (schema + seeds)** | `packages/db/migrations`, `packages/db/src/schema/*`, `packages/db/src/seed-*` | Verifica `bun run packages/db/src/migrate-all.ts` antes de commitear. Incluye nuevas tablas (fluxcore assistants/vectors/etc.). |
| 3 | **API / Backend FluxCore** | `apps/api/src/routes/*`, `services/*`, `ws-handler.ts`, `server.ts` | Describe nuevas rutas (`fluxcore.routes`, `fluxcore-runtime.routes`, `system-admin.routes`) y servicios (`smart-delay.service`, etc.). Adjunta pruebas manuales relevantes. |
| 4 | **Frontend FluxCore UI** | `apps/web/src/components/fluxcore/*`, `ui/Switch.tsx`, `hooks/useCreditBalance.ts`, `store/*` | Divide en commits más pequeños si es necesario (ej. “components base” vs. “UI polish”). Ejecuta `bun run dev` o `bun run lint` para validar. |
| 5 | **Componentes compartidos / UI kit** | `components/ui/*.tsx`, `components/layout`, `tailwind.config.js` | Aclara que se crearon `CollapsibleSection`, `SliderInput`, rediseño de switches, etc. |
| 6 | **Documentación adicional** | `docs/UI_PROTOCOL_STRICT.md`, `DOC_DATABASE.md`, `AUDIT_REPORT_2024-12-18.md` | Commit pequeño que solo contenga material documental para revisar rápidamente. |

> Consejo: si algún bloque es demasiado grande, crea subcommits (ej. `feat(api): add fluxcore routes` y `refactor(api): websocket handler`). Mientras la narrativa sea clara, puedes subir varios commits encadenados.

## 4. Flujo recomendado
1. **Actualizar dependencias y migraciones (si aplica)**
   ```powershell
   bun install
   docker-compose up -d postgres redis
   bun run packages/db/src/migrate-all.ts
   ```
2. **Validar pruebas/lint** antes de cada commit relevante.
3. **Staging por bloques** según la tabla anterior:
   ```powershell
   git add .env .env.example package.json QUICK_START.md
   git commit -m "chore(config): update quick start and env defaults"
   ```
4. **Repetir** para cada bloque. Usa `git status` tras cada commit para confirmar que solo quedan archivos del siguiente bloque.
5. **Push final** una vez revisado todo:
   ```powershell
   git push origin main
   ```

## 5. Cómo mantener el control de Git
- **Bitácora diaria**: abre cada sesión con `git status -sb` para saber qué quedó pendiente.
- **Etiquetas temporales**: si el trabajo es grande, crea una rama (`git checkout -b feat/fluxcore-ui`) y luego haz merge/fast-forward a `main` cuando todo esté probado.
- **Checkpoint rápido**: cuando termines una sección, haz commit incluso si falta otra (evita trabajo acumulado sin versionar).
- **Comunicación**: anota en el mensaje de commit cualquier instrucción para QA (“requiere correr migración X”).

Manteniendo estos pasos, tendrás siempre claro qué se modificó, por qué y cuándo subirlo a GitHub.
