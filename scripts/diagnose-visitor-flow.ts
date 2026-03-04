import { db, conversations, fluxcoreCognitionQueue, accounts } from '@fluxcore/db';
import { sql, eq } from 'drizzle-orm';

async function main() {
    console.log('🔍 DIAGNÓSTICO COMPLETO: Flujo de Visitantes y Políticas de IA\n');

    // 1. Verificar conversaciones de visitantes (sin relationshipId)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  CONVERSACIONES DE VISITANTES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const visitorConvs = await db.execute(sql`
        SELECT id, owner_account_id, visitor_token, relationship_id, channel, created_at
        FROM conversations
        WHERE visitor_token IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 5
    `) as any;

    if (visitorConvs.length === 0) {
        console.log('❌ No hay conversaciones de visitantes en la DB\n');
    } else {
        console.log(`✅ Encontradas ${visitorConvs.length} conversaciones de visitantes:\n`);
        visitorConvs.forEach((conv: any) => {
            console.log(`   Conversation: ${conv.id}`);
            console.log(`   Owner (Tenant): ${conv.owner_account_id}`);
            console.log(`   Visitor Token: ${conv.visitor_token}`);
            console.log(`   Relationship ID: ${conv.relationship_id || 'NULL (correcto para visitantes)'}`);
            console.log(`   Channel: ${conv.channel}`);
            console.log(`   Created: ${conv.created_at}`);
            console.log('');
        });
    }

    // 2. Verificar cognition queue para estas conversaciones
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  COGNITION QUEUE (Turn Window Processing)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const queueEntries = await db.execute(sql`
        SELECT cq.id, cq.conversation_id, cq.account_id, cq.target_account_id, 
               cq.processed_at, cq.turn_window_expires_at, cq.last_error, cq.attempts,
               c.visitor_token, c.owner_account_id
        FROM fluxcore_cognition_queue cq
        LEFT JOIN conversations c ON c.id = cq.conversation_id
        WHERE c.visitor_token IS NOT NULL
        ORDER BY cq.created_at DESC
        LIMIT 10
    `) as any;

    if (queueEntries.length === 0) {
        console.log('❌ No hay entradas en cognition queue para conversaciones de visitantes\n');
    } else {
        console.log(`✅ Encontradas ${queueEntries.length} entradas en cognition queue:\n`);
        queueEntries.forEach((entry: any) => {
            const isProcessed = entry.processed_at !== null;
            const isExpired = new Date(entry.turn_window_expires_at) < new Date();
            const hasError = entry.last_error !== null;
            
            console.log(`   Queue ID: ${entry.id}`);
            console.log(`   Conversation: ${entry.conversation_id}`);
            console.log(`   Visitor Token: ${entry.visitor_token}`);
            console.log(`   Owner (Tenant): ${entry.owner_account_id}`);
            console.log(`   account_id (enqueued): ${entry.account_id}`);
            console.log(`   target_account_id: ${entry.target_account_id || 'NULL'}`);
            console.log(`   Estado: ${isProcessed ? '✅ PROCESADO' : (isExpired ? '⏰ EXPIRADO (listo para procesar)' : '⏳ ESPERANDO')}`);
            console.log(`   Attempts: ${entry.attempts}`);
            if (hasError) {
                console.log(`   ❌ Error: ${entry.last_error}`);
            }
            console.log('');
        });
    }

    // 3. Verificar políticas de cuentas (tenant accounts)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  POLÍTICAS DE IA (fluxcore_account_policies)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const allAccounts = await db.select().from(accounts).limit(10);
    
    for (const account of allAccounts) {
        const [policy] = await db.execute(sql`
            SELECT account_id, mode, response_delay_ms, turn_window_ms
            FROM fluxcore_account_policies
            WHERE account_id = ${account.id}
        `) as any;

        const modeDisplay = !policy ? '🔴 NO EXISTE (se crea como OFF por defecto)' :
            policy.mode === 'auto' ? '🟢 AUTO (IA responde automáticamente)' :
            policy.mode === 'suggest' ? '🟡 SUGGEST (IA sugiere, operador aprueba)' :
            '🔴 OFF (IA deshabilitada)';

        console.log(`   Account: ${account.username} (${account.id.slice(0, 8)})`);
        console.log(`   Modo: ${modeDisplay}`);
        if (policy) {
            console.log(`   Response Delay: ${policy.response_delay_ms}ms`);
            console.log(`   Turn Window: ${policy.turn_window_ms}ms`);
        }
        console.log('');
    }

    // 4. Verificar relaciones self (yo con yo)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4️⃣  RELACIONES SELF (Violación Ontológica)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const selfRels = await db.execute(sql`
        SELECT r.id, r.account_a_id, r.account_b_id, r.created_at,
               a.username as account_name
        FROM relationships r
        LEFT JOIN accounts a ON a.id = r.account_a_id
        WHERE r.account_a_id = r.account_b_id
        ORDER BY r.created_at DESC
        LIMIT 10
    `) as any;

    if (selfRels.length === 0) {
        console.log('✅ No hay relaciones self (correcto)\n');
    } else {
        console.log(`❌ PROBLEMA: Encontradas ${selfRels.length} relaciones self:\n`);
        selfRels.forEach((rel: any) => {
            console.log(`   Relationship ID: ${rel.id}`);
            console.log(`   Account: ${rel.account_name} (${rel.account_a_id.slice(0, 8)})`);
            console.log(`   Created: ${rel.created_at}`);
            console.log(`   ⚠️  Esta relación es yo→yo (violación ontológica)`);
            console.log('');
        });
    }

    // 5. Resumen y diagnóstico
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('5️⃣  RESUMEN Y DIAGNÓSTICO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('PROBLEMAS IDENTIFICADOS:');
    console.log('');
    
    const policiesOff = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM fluxcore_account_policies
        WHERE mode = 'off'
    `) as any;
    
    if (policiesOff[0]?.count > 0) {
        console.log(`❌ ${policiesOff[0].count} cuenta(s) tienen policy mode='off' (IA deshabilitada)`);
        console.log('   → La IA NO responderá a mensajes de visitantes en estas cuentas');
        console.log('   → SOLUCIÓN: Cambiar mode a "auto" o "suggest"');
        console.log('');
    }

    if (selfRels.length > 0) {
        console.log(`❌ ${selfRels.length} relación(es) self (yo→yo) encontradas`);
        console.log('   → Violación ontológica de identidad');
        console.log('   → SOLUCIÓN: Eliminar lógica de self-relationship en ChatProjector');
        console.log('');
    }

    const unprocessedQueue = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM fluxcore_cognition_queue
        WHERE processed_at IS NULL
    `) as any;

    if (unprocessedQueue[0]?.count > 0) {
        console.log(`⏳ ${unprocessedQueue[0].count} entrada(s) pendientes en cognition queue`);
        console.log('   → Verificar si CognitionWorker está corriendo');
        console.log('   → Verificar logs para errores de procesamiento');
        console.log('');
    }

    console.log('FLUJO ESPERADO PARA VISITANTES:');
    console.log('  1. Visitor envía mensaje → WebchatGateway certifica → Signal creado');
    console.log('  2. IdentityProjector crea Actor + Address + Link');
    console.log('  3. ChatProjector crea Conversation (ownerAccountId + visitorToken, SIN relationshipId)');
    console.log('  4. ChatProjector encola en cognition_queue con target_account_id = ownerAccountId (tenant)');
    console.log('  5. CognitionWorker procesa → CognitiveDispatcher resuelve PolicyContext del TENANT');
    console.log('  6. Si policy.mode = "auto" → RuntimeGateway → AI responde → ActionExecutor persiste');
    console.log('  7. Mensaje de IA visible en UI');
    console.log('');
}

main().catch(console.error).then(() => process.exit(0));
