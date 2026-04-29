/**
 * Seed: WorkDefinitions para FluxCore (Sistema)
 * Este script define las capacidades operativas de FluxCore
 */

import { db } from './connection';
import { fluxcoreWorkDefinitions, accounts } from './schema';
import { eq } from 'drizzle-orm';

const FLUXCORE_ACCOUNT_ID = '5f96c4c5-473b-4574-93ce-53f54225dd18';

async function seedFluxCoreWES() {
  console.log('🤖 Verificando WorkDefinitions de FluxCore...');

  const [fluxcoreAcc] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, FLUXCORE_ACCOUNT_ID))
    .limit(1);

  if (!fluxcoreAcc) {
    console.error('❌ Cuenta FluxCore no encontrada. Ejecuta seed-fluxi.ts primero.');
    return;
  }

  const definitions = [
    {
      typeId: 'template_creation_v1',
      version: '1.0.0',
      definitionJson: {
        bindingAttribute: 'name',
        slots: [
          {
            path: 'name',
            type: 'string',
            required: true,
            description: 'Nombre descriptivo de la plantilla'
          },
          {
            path: 'content',
            type: 'string',
            required: true,
            description: 'Contenido de texto de la plantilla (soporta {{variables}})'
          },
          {
            path: 'category',
            type: 'string',
            required: false,
            description: 'Categoría (ej: ventas, soporte, bienvenida)'
          },
          {
            path: 'allow_automated_use',
            type: 'boolean',
            required: false,
            description: 'Si la IA puede usar esta plantilla automáticamente'
          }
        ],
        fsm: {
          initial: 'DRAFT',
          states: ['DRAFT', 'COMPLETED', 'CANCELLED'],
          transitions: [
            { from: 'DRAFT', to: 'COMPLETED', trigger: 'finish' }
          ]
        },
        policies: {
          autoOpen: true
        }
      }
    },
    {
      typeId: 'instruction_improvement_v1',
      version: '1.0.0',
      definitionJson: {
        bindingAttribute: 'improvements',
        slots: [
          {
            path: 'assistant_id',
            type: 'string',
            required: true,
            description: 'ID del asistente o runtime a mejorar'
          },
          {
            path: 'improvements',
            type: 'string',
            required: true,
            description: 'Nuevo bloque de instrucciones o mejoras propuestas'
          }
        ],
        fsm: {
          initial: 'DRAFT',
          states: ['DRAFT', 'COMPLETED', 'CANCELLED'],
          transitions: [
            { from: 'DRAFT', to: 'COMPLETED', trigger: 'finish' }
          ]
        },
        policies: {
          autoOpen: true
        }
      }
    }
  ];

  for (const def of definitions) {
    const [existing] = await db
      .select()
      .from(fluxcoreWorkDefinitions)
      .where(and(
        eq(fluxcoreWorkDefinitions.accountId, FLUXCORE_ACCOUNT_ID),
        eq(fluxcoreWorkDefinitions.typeId, def.typeId),
        eq(fluxcoreWorkDefinitions.version, def.version)
      ))
      .limit(1);

    if (existing) {
      console.log(`✅ Definition ${def.typeId} ya existe`);
      continue;
    }

    await db.insert(fluxcoreWorkDefinitions).values({
      accountId: FLUXCORE_ACCOUNT_ID,
      ...def,
    });
    console.log(`✅ Definition ${def.typeId} creada`);
  }

  console.log('✅ FluxCore WES seed completado');
}

import { and } from 'drizzle-orm';

seedFluxCoreWES()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
