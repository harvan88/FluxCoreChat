# FluxCore - Guía de Deployment

> Guía completa para desplegar FluxCore en producción

## Índice

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
3. [Deployment con Docker](#deployment-con-docker)
4. [Deployment Manual](#deployment-manual)
5. [Configuración de WhatsApp Business](#configuración-de-whatsapp-business)
6. [Monitoreo y Salud](#monitoreo-y-salud)
7. [Troubleshooting](#troubleshooting)

---

## Requisitos Previos

### Infraestructura Mínima
- **CPU:** 2 cores
- **RAM:** 4GB
- **Disco:** 20GB SSD
- **Sistema Operativo:** Linux (Ubuntu 22.04+ recomendado)

### Software Requerido
- Docker & Docker Compose v2+
- PostgreSQL 15+ (o usar el container incluido)
- Node.js 20+ o Bun 1.1+ (para build manual)

### Servicios Externos (Opcionales)
- Meta Developer Account (para WhatsApp Business)
- Groq API Key (para IA)

---

## Configuración de Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://postgres:your_secure_password@localhost:5432/fluxcore

# JWT
JWT_SECRET=your-super-secure-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://your-domain.com

# Groq AI (opcional)
GROQ_API_KEY=gsk_xxxxx

# WhatsApp Business (opcional)
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=fluxcore_verify
```

### Generación de JWT_SECRET Seguro

```bash
openssl rand -base64 32
```

---

## Deployment con Docker

### 1. Configurar docker-compose.yml

El archivo ya está configurado para producción. Ajustar variables de entorno:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: fluxcore
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: .
    environment:
      DATABASE_URL: postgres://postgres:${DB_PASSWORD:-postgres}@postgres:5432/fluxcore
      PORT: 3000
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET}
      GROQ_API_KEY: ${GROQ_API_KEY:-}
```

### 2. Build y Start

```bash
# Build
docker-compose build

# Start en background
docker-compose up -d

# Ver logs
docker-compose logs -f api
```

### 3. Ejecutar Migraciones

```bash
docker-compose exec api bun run db:migrate
```

### 4. Verificar Salud

```bash
curl http://localhost:3000/health
# {"status":"healthy","service":"fluxcore-api","version":"0.2.0"}
```

---

## Deployment Manual

### 1. Instalar Dependencias

```bash
# Con Bun (recomendado)
bun install --production

# O con npm
npm ci --production
```

### 2. Build de Producción

```bash
# API
cd apps/api && bun run build

# Web
cd apps/web && bun run build
```

### 3. Ejecutar Migraciones

```bash
bun run db:migrate
```

### 4. Iniciar Servidor

```bash
# Con PM2 (recomendado)
pm2 start apps/api/dist/server.js --name fluxcore-api

# O directamente
NODE_ENV=production bun run apps/api/src/index.ts
```

### 5. Servir Frontend

El build del frontend está en `apps/web/dist/`. Servir con Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/fluxcore/apps/web/dist;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Configuración de WhatsApp Business

### 1. Crear App en Meta Developers

1. Ir a [Meta for Developers](https://developers.facebook.com/)
2. Crear nueva app → Tipo: Business
3. Agregar producto: WhatsApp

### 2. Configurar Webhook

Endpoint: `https://your-domain.com/adapters/whatsapp/webhook`

Campos a suscribir:
- `messages`
- `message_template_status_update`

Token de verificación: usar `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

### 3. Obtener Access Token

1. En WhatsApp Settings → API Setup
2. Copiar el "Temporary access token" (válido 24h)
3. Para producción, crear System User y generar token permanente

### 4. Probar Envío

```bash
curl -i -X POST \
  https://graph.facebook.com/v22.0/YOUR_PHONE_NUMBER_ID/messages \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "RECIPIENT_PHONE",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": { "code": "en_US" }
    }
  }'
```

---

## Monitoreo y Salud

### Endpoints de Health Check

| Endpoint | Descripción |
|----------|-------------|
| `GET /health` | Estado general |
| `GET /health/live` | Liveness check (para Kubernetes) |
| `GET /health/ready` | Readiness check (DB conectada) |
| `GET /health/metrics` | Métricas del sistema |

### Ejemplo de Respuesta

```json
{
  "status": "healthy",
  "timestamp": "2024-12-08T00:00:00.000Z",
  "service": "fluxcore-api",
  "version": "0.2.0",
  "uptime": 3600.5
}
```

### Logs

Los logs están estructurados en JSON (producción):

```json
{
  "level": "info",
  "timestamp": "2024-12-08T00:00:00.000Z",
  "message": "Request handled",
  "method": "GET",
  "path": "/health",
  "status": 200,
  "duration": 5
}
```

---

## Troubleshooting

### Error: Puerto en uso

```bash
# Encontrar proceso
netstat -tulpn | grep 3000

# Matar proceso
kill -9 <PID>
```

### Error: Conexión a base de datos

```bash
# Verificar PostgreSQL
docker-compose ps postgres
docker-compose logs postgres

# Test conexión
psql $DATABASE_URL -c "SELECT 1"
```

### Error: WhatsApp Webhook

1. Verificar que el token de verificación coincida
2. Verificar que el endpoint sea HTTPS
3. Revisar logs: `docker-compose logs -f api | grep whatsapp`

### Error: WebSocket no conecta

1. Verificar que Nginx pase headers de upgrade
2. Verificar CORS settings
3. Probar conexión directa: `wscat -c ws://localhost:3000/ws`

---

## Checklist de Producción

- [ ] Variables de entorno configuradas
- [ ] JWT_SECRET seguro (32+ caracteres)
- [ ] HTTPS configurado
- [ ] Base de datos con backup automatizado
- [ ] Logs persistentes
- [ ] Monitoreo de salud configurado
- [ ] Firewall: solo puertos 80, 443 expuestos
- [ ] Rate limiting configurado (opcional)
- [ ] WhatsApp webhook verificado (si aplica)

---

> **Última actualización:** 2024-12-08
> **Versión:** 0.2.0
