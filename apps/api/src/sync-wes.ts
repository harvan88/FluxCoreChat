
import { db, fluxcoreWorkDefinitions } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

async function syncWES() {
  console.log('🔄 Sincronizando identidades WES...');
  
  const mappings = [
    { 
      uuid: '808bbf04-bec6-4f36-897e-a77d33db9057', 
      name: 'Envío de Plantillas', 
      id: 'templates' 
    },
    { 
      uuid: '969eb414-959c-406d-8700-e2ca843c4eb3', 
      name: 'Gestión de Plantillas', 
      id: 'template-management' 
    }
  ];

  for (const m of mappings) {
    try {
      // Nota: Si el ID (PK) cambia, es mejor borrar e insertar o actualizar el campo id si es permitido
      // En este caso, actualizaremos el NOMBRE y el JSON de definición primero
      await db.update(fluxcoreWorkDefinitions)
        .set({ 
          name: m.name,
          updatedAt: new Date()
        })
        .where(eq(fluxcoreWorkDefinitions.id, m.uuid));
      
      console.log(`✅ Actualizada herramienta: ${m.name}`);
    } catch (err: any) {
      console.error(`❌ Error al actualizar ${m.name}:`, err.message);
    }
  }
}

syncWES().then(() => process.exit(0));
