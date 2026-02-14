# Referencia de cuentas — harvan@hotmail.es

## Usuario principal
| Campo    | Valor                                   |
|----------|-----------------------------------------|
| user_id  | 535949b8-58a9-4310-87a7-42a2480f5746     |
| email    | harvan@hotmail.es                       |

## Cuentas hijas / perfiles
| account_id                             | username       | display_name   | account_type | email           | created_at              |
|----------------------------------------|----------------|----------------|--------------|-----------------|-------------------------|
| 3e94f74e-e6a0-4794-bd66-16081ee3b02d   | harvan_mkokevb2| Harold Ordóñez | personal     | harvan@hot...   | 2026-01-21 21:58:51.142Z |
| a9611c11-70f2-46cd-baef-6afcde715f3a   | daniel_mkonr9z2| Daniel Test    | personal     | daniel@test.com | 2026-01-21 23:32:28.000Z |
| 5f96c4c5-473b-4574-93ce-53f54225dd18   | fluxcore       | Flux Core      | business     | —               | 2026-01-21 22:06:08.832Z |

## Credenciales de Acceso
| Usuario            | Email             | Contraseña     |
|--------------------|-------------------|----------------|
| **Harold Ordóñez** | harvan@hotmail.es | 4807114hH.     |
| **Daniel Test**    | daniel@test.com   | 123456         |

## Cómo garantizar consultas más rápidas
Para optimizar las verificaciones de estado y base de datos sin depender de la carga del frontend o logs extensos, se deben usar scripts directos de Bun:

1. **Verificar Motor Activo:**
   ```bash
   bun -e "import { db, accountRuntimeConfig } from '@fluxcore/db'; import { eq } from 'drizzle-orm'; const r = await db.select().from(accountRuntimeConfig).where(eq(accountRuntimeConfig.accountId, 'ID_CUENTA')); console.log(r[0]?.activeRuntimeId);"
   ```
2. **Consultar Últimos Mensajes:**
   Usar el comando `Get-Content fluxcore-trace.log -Tail 100` para ver la actividad en tiempo real del orquestador.

*Notas:* Estas credenciales son para uso exclusivo en entornos de prueba y desarrollo.
