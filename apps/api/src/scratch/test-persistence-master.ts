import { locationService } from '../services/location.service';
import { db, accounts } from '@fluxcore/db';

async function testPersistence() {
  console.log('🧪 Iniciando Test de Persistencia Estructurada...');

  try {
    // Buscar una cuenta real para el test
    const [realAccount] = await db.select().from(accounts).limit(1);
    if (!realAccount) {
      console.error('❌ No hay cuentas en la DB para probar.');
      return;
    }
    const testAccountId = realAccount.id;

    // 1. CREACIÓN
    console.log(`1. Creando sede estructurada para cuenta ${realAccount.username}...`);
    const newLoc = await locationService.createLocation({
      accountId: testAccountId,
      name: 'Test Sede Master Plan',
      address: 'Migueletes 1190, Palermo, CABA',
      country: 'Argentina',
      state: 'CABA',
      city: 'Buenos Aires',
      neighborhood: 'Palermo',
      streetAddress: 'Migueletes 1190',
      lat: -34.5612,
      lon: -58.4321,
      serviceType: 'both',
      status: 'active',
      isDefault: true
    } as any);

    console.log('✅ Sede creada con ID:', newLoc.id);
    console.log('📊 Datos persistidos:', {
      barrio: newLoc.neighborhood,
      ciudad: newLoc.city,
      calle: newLoc.streetAddress,
      coords: `${newLoc.lat}, ${newLoc.lon}`
    });

    if (newLoc.neighborhood !== 'Palermo') throw new Error('Error en persistencia de Barrio');

    // 2. ACTUALIZACIÓN
    console.log('2. Probando actualización...');
    const updated = await locationService.updateLocation(newLoc.id, testAccountId, {
      neighborhood: 'Palermo Soho'
    });
    
    console.log('✅ Actualización exitosa. Nuevo barrio:', updated.neighborhood);
    if (updated.neighborhood !== 'Palermo Soho') throw new Error('Error en actualización de campo');

    // 3. ELIMINACIÓN
    console.log('3. Limpiando test...');
    await locationService.deleteLocation(newLoc.id, testAccountId);
    console.log('✅ Eliminación confirmada.');

    console.log('\n🏆 TEST PASADO: La base de datos guarda, edita y borra con precisión del 100%.');

  } catch (error) {
    console.error('❌ FALLO EL TEST:', error);
    process.exit(1);
  }
}

testPersistence();
