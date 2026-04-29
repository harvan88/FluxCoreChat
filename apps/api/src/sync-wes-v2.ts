
import { db, fluxcoreWorkDefinitions } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function syncWES() {
  console.log('🔄 Sincronizando identidades WES (v2)...');
  
  const mappings = [
    { 
      uuid: '808bbf04-bec6-4f36-897e-a77d33db9057', 
      typeId: 'templates' 
    },
    { 
      uuid: '969eb414-959c-406d-8700-e2ca843c4eb3', 
      typeId: 'template-management' 
    }
  ];

  for (const m of mappings) {
    try {
      await db.update(fluxcoreWorkDefinitions)
        .set({ 
          typeId: m.typeId
        })
        .where(eq(fluxcoreWorkDefinitions.id, m.uuid));
      
      console.log(`✅ Actualizada definición WES: ${m.typeId}`);
    } catch (err: any) {
      console.error(`❌ Error al actualizar ${m.typeId}:`, err.message);
    }
  }
}

syncWES().then(() => process.exit(0));
