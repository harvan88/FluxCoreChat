import { scheduleService } from './services/schedule.service';
import { db, weeklySchedules, weeklyIntervals, accounts } from '@fluxcore/db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function testPersistence() {
  console.log('🚀 Iniciando prueba de persistencia para el Motor de Horarios...');
  
  const testOwnerId = uuidv4();
  const testOwnerType = 'test_location';

  try {
    // 1. Crear horario semanal para Lunes
    console.log('1. Creando horario semanal para Lunes...');
    await scheduleService.upsertWeeklySchedule(testOwnerType, testOwnerId, [
      { dayOfWeek: 1, isClosed: false, ownerType: testOwnerType, ownerId: testOwnerId }
    ]);

    // 2. Agregar intervalos
    console.log('2. Agregando intervalos (09:00 - 13:00, 17:00 - 21:00)...');
    await scheduleService.replaceWeeklyIntervals(testOwnerType, testOwnerId, 1, [
      { openTime: '09:00', closeTime: '13:00' },
      { openTime: '17:00', closeTime: '21:00' }
    ]);

    // 3. Verificar persistencia
    console.log('3. Verificando persistencia en DB...');
    const result = await scheduleService.getSchedule(testOwnerType, testOwnerId);
    
    if (result.weekly.length === 1 && result.intervals.length === 2) {
      console.log('✅ Persistencia semanal confirmada.');
      console.log('   - Horarios:', JSON.stringify(result.weekly[0]));
      console.log('   - Intervalos:', JSON.stringify(result.intervals));
    } else {
      throw new Error(`Fallo en la verificación: se esperaba 1 día y 2 intervalos, se obtuvo ${result.weekly.length} y ${result.intervals.length}`);
    }

    // 4. Probar Fecha Especial (Feriado)
    console.log('4. Creando fecha especial (Feriado de prueba)...');
    const specialDate = await scheduleService.upsertSpecialDate(testOwnerType, testOwnerId, {
      date: '2026-12-25',
      isClosed: true,
      label: 'Navidad de Prueba',
      ownerType: testOwnerType,
      ownerId: testOwnerId
    });
    console.log('✅ Fecha especial creada ID:', specialDate.id);

    // 6. Probar Persistencia Regional en Account (SSOT)
    console.log('6. Probando persistencia regional en Account (SSOT)...');
    const { accountService } = await import('./services/account.service');
    // Usamos una cuenta real del sistema o creamos una temporal si el servicio lo permite
    // En este caso, buscaremos la primera cuenta del usuario para el test o una conocida
    const accountsList = await db.select().from(accounts).limit(1);
    if (accountsList.length > 0) {
      const targetAcc = accountsList[0];
      console.log(`   - Actualizando cuenta ${targetAcc.id} con AR / America/Argentina/Buenos_Aires...`);
      await accountService.updateAccount(targetAcc.id, targetAcc.ownerUserId, {
        country: 'AR',
        timezone: 'America/Argentina/Buenos_Aires'
      });
      
      const updatedAcc = await db.query.accounts.findFirst({
        where: eq(accounts.id, targetAcc.id)
      });
      
      if (updatedAcc?.country === 'AR' && updatedAcc?.timezone === 'America/Argentina/Buenos_Aires') {
        console.log('✅ Persistencia regional confirmada en Account.');
      } else {
        throw new Error('Fallo en la persistencia regional.');
      }
    }

    // 7. Cleanup
    console.log('7. Ejecutando limpieza total para el owner de prueba...');
    await scheduleService.deleteSchedulesForOwner(testOwnerType, testOwnerId);
    
    const finalCheck = await scheduleService.getSchedule(testOwnerType, testOwnerId);
    if (finalCheck.weekly.length === 0 && finalCheck.special.length === 0) {
      console.log('✅ Limpieza exitosa. Motor polimórfico funcionando correctamente.');
    } else {
      throw new Error('Fallo en la limpieza: quedaron registros huérfanos.');
    }

    console.log('\n✨ PRUEBA DE PERSISTENCIA FINALIZADA CON ÉXITO ✨');
    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR EN LA PRUEBA:', error);
    process.exit(1);
  }
}

testPersistence();
