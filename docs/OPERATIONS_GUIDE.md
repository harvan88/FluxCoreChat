# FluxCore - Guía de Operaciones

**Versión:** 1.0.0  
**Fecha:** 2024-12-08  
**Hito:** 11 - Madurez Operativa

---

## 📋 Índice

1. [Health Checks](#health-checks)
2. [Monitoreo](#monitoreo)
3. [Métricas](#métricas)
4. [Troubleshooting](#troubleshooting)
5. [Deployment](#deployment)

---

## 🏥 Health Checks

### Endpoints Disponibles

#### GET /health
**Propósito:** Health check básico - verifica que el proceso esté vivo

**Respuesta:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-08T20:00:00.000Z",
  "service": "fluxcore-api",
  "version": "0.2.0",
  "uptime": 3600.5
}
```

**Uso:**
```bash
curl http://localhost:3000/health
```

---

#### GET /health/live
**Propósito:** Liveness probe para Kubernetes/Docker

**Respuesta:**
```json
{
  "status": "alive",
  "timestamp": "2024-12-08T20:00:00.000Z"
}
```

**Configuración Kubernetes:**
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

---

#### GET /health/ready
**Propósito:** Readiness probe - verifica dependencias (DB, memoria)

**Respuesta (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-08T20:00:00.000Z",
  "uptime": 3600.5,
  "version": "0.2.0",
  "service": "fluxcore-api",
  "checks": {
    "database": {
      "status": "pass",
      "responseTime": 15
    },
    "memory": {
      "status": "pass",
      "message": "45.23% used"
    }
  }
}
```

**Respuesta (Degraded):**
```json
{
  "status": "degraded",
  "checks": {
    "database": {
      "status": "pass",
      "responseTime": 15
    },
    "memory": {
      "status": "fail",
      "message": "92.50% used"
    }
  }
}
```

**Respuesta (Unhealthy):**
```json
{
  "status": "unhealthy",
  "checks": {
    "database": {
      "status": "fail",
      "message": "Connection refused"
    }
  }
}
```

**Configuración Kubernetes:**
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  successThreshold: 1
  failureThreshold: 3
```

---

#### GET /health/metrics
**Propósito:** Métricas del sistema para monitoreo

**Respuesta:**
```json
{
  "timestamp": "2024-12-08T20:00:00.000Z",
  "uptime": 3600.5,
  "memory": {
    "heapUsed": 45678912,
    "heapTotal": 101285888,
    "rss": 123456789,
    "external": 1234567,
    "heapUsedPercent": "45.09"
  },
  "cpu": {
    "user": 1234567,
    "system": 234567
  },
  "nodeVersion": "v20.10.0",
  "platform": "linux",
  "arch": "x64"
}
```

---

## 📊 Monitoreo

### Estados del Sistema

| Estado | Código HTTP | Descripción | Acción |
|--------|-------------|-------------|--------|
| **healthy** | 200 | Todos los checks pasan | Ninguna |
| **degraded** | 200 | Algunos checks fallan (no críticos) | Investigar |
| **unhealthy** | 503 | Checks críticos fallan | Alerta inmediata |

### Checks Implementados

#### 1. Database Check
- **Qué verifica:** Conectividad a PostgreSQL
- **Cómo:** Query simple `SELECT 1`
- **Timeout:** Medido en responseTime
- **Falla si:** Error de conexión o timeout

#### 2. Memory Check
- **Qué verifica:** Uso de memoria heap
- **Umbral:** 90% de heap usado
- **Falla si:** > 90% usado
- **Estado:** `degraded` si falla (no crítico)

---

## 🔍 Métricas

### Métricas de Memoria

```javascript
{
  "heapUsed": 45678912,      // Bytes usados del heap
  "heapTotal": 101285888,    // Total del heap asignado
  "rss": 123456789,          // Resident Set Size (memoria total)
  "external": 1234567,       // Memoria externa (buffers, etc.)
  "heapUsedPercent": "45.09" // Porcentaje usado
}
```

**Alertas recomendadas:**
- ⚠️ Warning: > 70% heap usado
- 🚨 Critical: > 90% heap usado

### Métricas de CPU

```javascript
{
  "user": 1234567,    // Microsegundos en user mode
  "system": 234567    // Microsegundos en system mode
}
```

### Uptime

- Tiempo en segundos desde que inició el proceso
- Útil para detectar reinicios inesperados

---

## 🔧 Troubleshooting

### Database Unhealthy

**Síntomas:**
```json
{
  "status": "unhealthy",
  "checks": {
    "database": {
      "status": "fail",
      "message": "Connection refused"
    }
  }
}
```

**Causas comunes:**
1. PostgreSQL no está corriendo
2. Credenciales incorrectas
3. Network issues
4. Database saturada

**Soluciones:**
```bash
# Verificar PostgreSQL
docker ps | grep postgres

# Ver logs de PostgreSQL
docker logs fluxcore-postgres

# Verificar conexión
psql -h localhost -U postgres -d fluxcore

# Reiniciar PostgreSQL
docker restart fluxcore-postgres
```

---

### Memory Degraded

**Síntomas:**
```json
{
  "status": "degraded",
  "checks": {
    "memory": {
      "status": "fail",
      "message": "92.50% used"
    }
  }
}
```

**Causas comunes:**
1. Memory leak
2. Carga alta sostenida
3. Configuración insuficiente

**Soluciones:**
```bash
# Ver métricas detalladas
curl http://localhost:3000/health/metrics

# Reiniciar servicio (temporal)
docker restart fluxcore-api

# Aumentar memoria (permanente)
# En docker-compose.yml:
services:
  api:
    deploy:
      resources:
        limits:
          memory: 2G
```

---

### Slow Response Times

**Síntomas:**
```json
{
  "checks": {
    "database": {
      "status": "pass",
      "responseTime": 5000  // > 1000ms es lento
    }
  }
}
```

**Causas comunes:**
1. Database saturada
2. Queries lentas
3. Falta de índices
4. Conexiones agotadas

**Soluciones:**
```bash
# Ver queries activas en PostgreSQL
SELECT pid, query, state, query_start 
FROM pg_stat_activity 
WHERE state = 'active';

# Ver conexiones
SELECT count(*) FROM pg_stat_activity;

# Analizar queries lentas
# Habilitar log_min_duration_statement en postgresql.conf
```

---

## 🚀 Deployment

### Pre-Deployment Checklist

- [ ] Health checks configurados
- [ ] Liveness probe funcionando
- [ ] Readiness probe funcionando
- [ ] Métricas accesibles
- [ ] Logs estructurados
- [ ] Variables de entorno configuradas
- [ ] Database migrations aplicadas

### Docker Compose

```yaml
version: '3.8'

services:
  api:
    image: fluxcore-api:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/fluxcore
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fluxcore-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fluxcore-api
  template:
    metadata:
      labels:
        app: fluxcore-api
    spec:
      containers:
      - name: api
        image: fluxcore-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: fluxcore-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

---

## 📈 Monitoring Integrations

### Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'fluxcore-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/health/metrics'
    scrape_interval: 15s
```

### Grafana Dashboard

**Métricas clave:**
- Health status (healthy/degraded/unhealthy)
- Database response time
- Memory usage percentage
- CPU usage
- Uptime
- Request rate

---

## 🚨 Alerting

### Recommended Alerts

#### Critical Alerts

```yaml
# Database Down
alert: DatabaseDown
expr: health_database_status == 0
for: 1m
labels:
  severity: critical
annotations:
  summary: "Database is down"
  description: "FluxCore API cannot connect to database"

# Memory Critical
alert: MemoryCritical
expr: health_memory_percent > 90
for: 5m
labels:
  severity: critical
annotations:
  summary: "Memory usage critical"
  description: "Heap usage is {{ $value }}%"
```

#### Warning Alerts

```yaml
# Memory Warning
alert: MemoryWarning
expr: health_memory_percent > 70
for: 10m
labels:
  severity: warning
annotations:
  summary: "Memory usage high"
  description: "Heap usage is {{ $value }}%"

# Slow Database
alert: SlowDatabase
expr: health_database_response_time_ms > 1000
for: 5m
labels:
  severity: warning
annotations:
  summary: "Database response slow"
  description: "Database response time is {{ $value }}ms"
```

---

## 📝 Best Practices

1. **Monitor Continuously**
   - Check `/health/metrics` every 15s
   - Alert on degraded state after 5min
   - Alert on unhealthy state immediately

2. **Graceful Degradation**
   - System can run with degraded memory
   - Database failure is critical - alert immediately

3. **Resource Limits**
   - Set memory limits in production
   - Monitor heap usage trends
   - Plan capacity based on metrics

4. **Logging**
   - Log all health check failures
   - Include context (requestId, timestamp)
   - Use structured logging

5. **Testing**
   - Test health checks in CI/CD
   - Simulate failures (kill DB, fill memory)
   - Verify alerts trigger correctly

---

## 🔗 Related Documentation

- [EXECUTION_PLAN.md](./EXECUTION_PLAN.md) - Project roadmap
- [ESTADO_PROYECTO.md](./ESTADO_PROYECTO.md) - Current status
- [COMPONENT_LIBRARY.md](./COMPONENT_LIBRARY.md) - UI components
- [TOTEM.md](../TOTEM.md) - System architecture

---

**Mantenido por:** FluxCore Team  
**Última actualización:** 2024-12-08  
**Versión:** 1.0.0
