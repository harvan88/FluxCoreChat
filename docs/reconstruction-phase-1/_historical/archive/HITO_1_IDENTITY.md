# Hito 1: Fundamentos de Identidad

## Resumen

Implementación completa del sistema de identidad de FluxCore, incluyendo autenticación de usuarios, gestión de cuentas y control de acceso.

## Tareas Completadas

### FC-010: Schema SQL users ✅
- Tabla `users` con campos: id, email, password_hash, name, timestamps
- Validación de email único
- Tipos TypeScript generados con Drizzle

### FC-011: Schema SQL accounts ✅
- Tabla `accounts` con campos: id, owner_user_id, username, display_name, account_type, profile, private_context
- Relación con users (FK con cascade delete)
- Username único
- Soporte para profile JSONB y private_context (max 5000 chars)

### FC-012: Schema SQL actors ✅
- Tabla `actors` para relaciones user-account (workspaces colaborativos)
- Campos: id, user_id, account_id, role
- Preparado para Hito 9 (Workspaces)

### FC-013: Auth endpoint - Register ✅
- `POST /auth/register`
- Validación de email y password
- Hash de contraseña con bcrypt (10 rounds)
- Generación de JWT token
- Respuesta con user y token

### FC-014: Auth endpoint - Login ✅
- `POST /auth/login`
- Verificación de credenciales
- Retorna user, accounts list y JWT token
- Manejo de errores 401

### FC-015: Auth endpoint - Logout ✅
- `POST /auth/logout`
- Logout manejado client-side (JWT stateless)
- Endpoint para consistencia de API

### FC-016: Auth middleware ✅
- Middleware JWT con @elysiajs/jwt
- Extracción y verificación de token desde header Authorization
- Macro `isAuthenticated` para proteger rutas
- Usuario disponible en context

### FC-017: Account CRUD endpoints ✅
- `GET /accounts` - Listar cuentas del usuario
- `POST /accounts` - Crear nueva cuenta
- `GET /accounts/:id` - Obtener cuenta por ID
- `PATCH /accounts/:id` - Actualizar cuenta
- Validación de ownership
- Validación de private_context (max 5000 chars)
- Creación automática de actor (role: owner)

## Estructura de Archivos

```
packages/db/src/schema/
├── users.ts           # Schema de usuarios
├── accounts.ts        # Schema de cuentas
├── actors.ts          # Schema de actores
└── index.ts           # Exports

apps/api/src/
├── services/
│   ├── auth.service.ts      # Lógica de autenticación
│   └── account.service.ts   # Lógica de cuentas
├── middleware/
│   └── auth.middleware.ts   # Middleware JWT
├── routes/
│   ├── auth.routes.ts       # Rutas de auth
│   └── accounts.routes.ts   # Rutas de accounts
└── test-api.ts              # Script de pruebas

packages/db/migrations/
└── 0000_strong_proudstar.sql  # Migración inicial
```

## API Endpoints

### Autenticación

#### POST /auth/register
Registra un nuevo usuario.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "jwt-token"
  }
}
```

#### POST /auth/login
Inicia sesión.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "accounts": [],
    "token": "jwt-token"
  }
}
```

#### POST /auth/logout
Cierra sesión (client-side).

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Cuentas

Todas las rutas de cuentas requieren autenticación (Header: `Authorization: Bearer <token>`).

#### GET /accounts
Lista todas las cuentas del usuario autenticado.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "johndoe",
      "displayName": "John Doe",
      "accountType": "personal",
      "profile": {},
      "privateContext": null
    }
  ]
}
```

#### POST /accounts
Crea una nueva cuenta.

**Request:**
```json
{
  "username": "johndoe",
  "displayName": "John Doe",
  "accountType": "personal",
  "profile": {
    "bio": "Software developer"
  },
  "privateContext": "Private notes..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "johndoe",
    "displayName": "John Doe",
    "accountType": "personal",
    "profile": { "bio": "Software developer" },
    "privateContext": "Private notes..."
  }
}
```

#### GET /accounts/:id
Obtiene una cuenta por ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "johndoe",
    "displayName": "John Doe",
    "accountType": "personal",
    "profile": {},
    "privateContext": null
  }
}
```

#### PATCH /accounts/:id
Actualiza una cuenta.

**Request:**
```json
{
  "displayName": "John Updated",
  "profile": {
    "bio": "Updated bio"
  },
  "privateContext": "Updated private context"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "johndoe",
    "displayName": "John Updated",
    "accountType": "personal",
    "profile": { "bio": "Updated bio" },
    "privateContext": "Updated private context"
  }
}
```

## Seguridad

### Password Hashing
- Bcrypt con 10 salt rounds
- Passwords nunca se almacenan en texto plano
- Hash verificado en login

### JWT Tokens
- Secret configurable via `JWT_SECRET` env var
- Payload incluye: userId, email
- Verificación en cada request protegido
- Stateless (no se almacenan en servidor)

### Validaciones
- Email format validation
- Password mínimo 6 caracteres
- Username único (3-100 chars)
- Private context máximo 5000 caracteres
- Ownership verification en updates

## Testing

### Script de Pruebas
Ejecutar el script de pruebas:

```bash
# Asegúrate de que el API esté corriendo
bun run dev

# En otra terminal, ejecuta las pruebas
bun run apps/api/src/test-api.ts
```

El script prueba:
1. ✅ Register User
2. ✅ Login User
3. ✅ Create Account
4. ✅ Get Accounts
5. ✅ Update Account

### Pruebas Manuales con cURL

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Create Account (usa el token del login)
curl -X POST http://localhost:3000/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"username":"testuser","displayName":"Test User","accountType":"personal"}'

# Get Accounts
curl http://localhost:3000/accounts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Base de Datos

### Configuración
1. Instalar PostgreSQL
2. Crear base de datos: `createdb fluxcore`
3. Configurar `DATABASE_URL` en `.env`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/fluxcore
   ```

### Migraciones
```bash
# Generar migraciones
cd packages/db
bun run db:generate

# Aplicar migraciones
bun run db:migrate

# Push schema directamente (desarrollo)
bun run db:push

# Abrir Drizzle Studio
bun run db:studio
```

## Próximos Pasos

**Hito 2: Chat Core** (2 semanas)
- FC-040: Schema relationships
- FC-041: Schema conversations
- FC-042: Schema messages
- FC-043: Schema message_enrichments
- FC-044-066: Endpoints y WebSocket

## Notas Técnicas

### Decisiones de Diseño

1. **JWT Stateless**: Tokens no se almacenan en servidor para escalabilidad
2. **Bcrypt**: Algoritmo probado y seguro para hashing de passwords
3. **Drizzle ORM**: Type-safe queries y migraciones automáticas
4. **Elysia**: Framework rápido y moderno con excelente DX
5. **Separación User/Account**: Permite múltiples identidades por persona

### Limitaciones Conocidas

1. **JWT Revocation**: No hay blacklist de tokens (se implementará en Hito 10)
2. **Rate Limiting**: No implementado aún (Hito 10)
3. **Email Verification**: No implementado (opcional para MVP)
4. **Password Reset**: No implementado (opcional para MVP)

### Performance

- Índices en: `users.email`, `accounts.username`, `accounts.owner_user_id`
- Queries optimizadas con Drizzle
- JWT verificación rápida (sin DB lookup)

## Commits

- `71d7d49` - feat(db): add users, accounts, and actors schemas
- `7bc9956` - feat(api): implement authentication and account management

---

**Duración**: 2 semanas (estimado)
**Estado**: ✅ Completado
**Siguiente**: Hito 2 - Chat Core
