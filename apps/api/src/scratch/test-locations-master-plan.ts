import { db, accountLocations, accounts } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';
import { fluxPolicyContextService } from '../services/flux-policy-context.service';

const TEST_ACCOUNT_ID = '3e94f74e-e6a0-4794-bd66-16081ee3b02d'; // Harold Ordoñez
const DUMMY_CONTACT_ID = '00000000-0000-0000-0000-000000000000';

async function runTest() {
  console.log('🧪 Iniciando Test de Ubicaciones (Master Plan Alignment)...');

  try {
    // 1. Limpiar previas
    await db.delete(accountLocations).where(eq(accountLocations.accountId, TEST_ACCOUNT_ID));
    
    // 2. CREACIÓN
    console.log('📝 Test: Creación...');
    const [newLoc] = await db.insert(accountLocations).values({
      accountId: TEST_ACCOUNT_ID,
      name: 'Sede Master Plan',
      address: 'Calle Falsa 123',
      lat: -34.6037,
      lon: -58.3816,
      serviceType: 'both',
      coverageRadiusKm: 15,
      phone: '+541112345678',
      email: 'sede@masterplan.com',
      timezone: 'America/Argentina/Buenos_Aires',
      status: 'active',
      isDefault: true
    }).returning();
    
    console.log(`✅ Sede creada con ID: ${newLoc.id}`);

    // 3. PERSISTENCIA / LECTURA
    console.log('📖 Test: Persistencia y Lectura...');
    const readLoc = await db.query.accountLocations.findFirst({
      where: eq(accountLocations.id, newLoc.id)
    });
    
    if (readLoc?.serviceType === 'both' && readLoc?.lat === -34.6037) {
      console.log('✅ Datos persistidos correctamente.');
    } else {
      throw new Error('Datos de persistencia no coinciden.');
    }

    // 4. EDICIÓN
    console.log('✏️ Test: Edición...');
    const [updatedLoc] = await db.update(accountLocations)
      .set({ name: 'Sede Master Plan Editada', status: 'temp_closed' })
      .where(eq(accountLocations.id, newLoc.id))
      .returning();
    
    if (updatedLoc.name === 'Sede Master Plan Editada' && updatedLoc.status === 'temp_closed') {
      console.log('✅ Edición exitosa.');
    } else {
      throw new Error('Fallo en la edición.');
    }

    // 5. PROYECCIÓN AUTORIZADA A FLUXCORE
    console.log('🧠 Test: Proyección a FluxCore (Policy Context)...');
    
    // Caso A: Autorizado
    await db.update(accounts).set({ aiIncludeLocations: true }).where(eq(accounts.id, TEST_ACCOUNT_ID));
    // Reactivamos la sede para que sea proyectada (solo proyecta 'active')
    await db.update(accountLocations).set({ status: 'active' }).where(eq(accountLocations.id, newLoc.id));
    
    const contextAuth = await fluxPolicyContextService.resolveContext(TEST_ACCOUNT_ID, DUMMY_CONTACT_ID, 'whatsapp');
    const profileAuth = contextAuth.policyContext.resolvedBusinessProfile as any;
    
    if (profileAuth.locations && profileAuth.locations.length > 0) {
      console.log('✅ Proyección AUTORIZADA funciona (Sedes visibles en contexto).');
      console.log('   Sede proyectada:', JSON.stringify(profileAuth.locations[0], null, 2));
    } else {
      throw new Error('La sede no se proyectó estando autorizada.');
    }

    // Caso B: No Autorizado
    await db.update(accounts).set({ aiIncludeLocations: false }).where(eq(accounts.id, TEST_ACCOUNT_ID));
    const contextNoAuth = await fluxPolicyContextService.resolveContext(TEST_ACCOUNT_ID, DUMMY_CONTACT_ID, 'whatsapp');
    const profileNoAuth = contextNoAuth.policyContext.resolvedBusinessProfile as any;

    if (!profileNoAuth.locations) {
      console.log('✅ Proyección NO AUTORIZADA funciona (Sedes ocultas).');
    } else {
      throw new Error('La sede se proyectó a pesar de estar DESAUTORIZADA.');
    }

    // 6. ELIMINACIÓN
    console.log('🗑️ Test: Eliminación...');
    await db.delete(accountLocations).where(eq(accountLocations.id, newLoc.id));
    const finalCheck = await db.query.accountLocations.findFirst({
      where: eq(accountLocations.id, newLoc.id)
    });
    
    if (!finalCheck) {
      console.log('✅ Eliminación exitosa.');
    } else {
      throw new Error('La sede aún existe después del delete.');
    }

    console.log('\n✨ TODOS LOS TESTS PASARON EXITOSAMENTE ✨');

  } catch (error) {
    console.error('❌ FALLO EL TEST:', error);
    process.exit(1);
  }
}

runTest();
