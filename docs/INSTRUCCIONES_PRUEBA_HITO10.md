# Instrucciones de Prueba - Hito 10: Producción Ready

## Requisitos Previos

1. **Bun** >= 1.0.0
2. **Docker** (opcional, para despliegue)
3. **PostgreSQL** >= 14

---

## Paso 1: Ejecutar Pruebas Automatizadas

### Con npm/bun scripts
```powershell
cd c:\Users\harva\Documents\Trabajos\meetgar\FluxCoreChat\FluxCoreChat

# Iniciar servidor (en otra terminal)
bun run api:start

# Ejecutar pruebas
bun run test
```

**Resultado esperado:**
```
✅ Chat System               8/8
✅ Extension System          11/11
✅ AI Core                   12/12
✅ Context System            16/16
✅ Appointments              12/12
✅ Adapters                  8/8
✅ Workspaces                16/16
   Total                     83/83
🎉 ¡Todas las pruebas pasaron!
```

---

## Paso 2: Probar Docker

### 2.1 Build de imagen
```powershell
docker build -t fluxcore/api:latest .
```

### 2.2 Ejecutar con Docker Compose
```powershell
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Verificar estado
docker-compose ps

# Detener
docker-compose down
```

### 2.3 Verificar Health Check
```powershell
curl http://localhost:3000/health
# Respuesta esperada: {"status":"ok",...}
```

---

## Paso 3: Verificar CI/CD

El workflow de GitHub Actions (`.github/workflows/ci.yml`) se ejecuta en:
- Push a `main` o `develop`
- Pull requests a `main` o `develop`

### Jobs del CI:
1. **lint**: Type check
2. **test**: 83 pruebas automatizadas
3. **build**: Construir paquetes
4. **docker**: Build de imagen (solo en main)

---

## Paso 4: Verificar Documentación

### Archivos de documentación:
- [ ] `README.md` actualizado
- [ ] `docs/HITO_10_PRODUCTION.md`
- [ ] `docs/INSTRUCCIONES_PRUEBA_HITO10.md`
- [ ] `.github/workflows/ci.yml`
- [ ] `Dockerfile`
- [ ] `docker-compose.yml`

---

## Paso 5: Verificar Scripts

```powershell
# Verificar que los scripts existen
bun run --list

# Scripts disponibles:
# - dev
# - build
# - lint
# - test
# - test:ci
# - clean
# - format
# - typecheck
# - db:migrate
# - api:start
# - docker:up
# - docker:down
```

---

## Paso 6: Verificar API en Swagger

1. Abrir: **http://localhost:3000/swagger**
2. Verificar que todas las secciones estén visibles:
   - Health
   - Auth
   - Accounts
   - Relationships
   - Conversations
   - Messages
   - Extensions
   - AI
   - Context
   - Appointments
   - Adapters
   - Workspaces

---

## Checklist de Verificación Final

### Pruebas
- [ ] 83/83 pruebas pasando
- [ ] Health check funciona

### Docker
- [ ] Dockerfile construye correctamente
- [ ] docker-compose inicia todos los servicios
- [ ] API responde en localhost:3000

### CI/CD
- [ ] Workflow de GitHub Actions creado
- [ ] Jobs configurados correctamente

### Documentación
- [ ] README actualizado con estado del proyecto
- [ ] Documentación de todos los hitos
- [ ] Instrucciones de deployment

### Scripts
- [ ] `bun run test` ejecuta pruebas
- [ ] `bun run api:start` inicia servidor
- [ ] `bun run docker:up` inicia Docker

---

## Resumen del Proyecto

| Métrica | Valor |
|---------|-------|
| Hitos completados | 10/10 |
| Pruebas totales | 83 |
| Pruebas pasando | 83 (100%) |
| Endpoints API | 50+ |
| Extensiones | 2 |
| Adapters | 1 (WhatsApp) |

---

**Última actualización**: 2025-12-06
