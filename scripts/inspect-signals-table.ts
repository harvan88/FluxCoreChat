import { db, sql } from '@fluxcore/db';

async function inspectTable() {
    console.log('🔍 INSPECCIÓN DE TABLA fluxcore_signals\n');
    
    try {
        // 1. Verificar si la tabla existe
        const tableExists = await db.execute(sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'fluxcore_signals'
            )
        `);
        console.log('Tabla existe:', tableExists[0]?.exists);
        
        if (!tableExists[0]?.exists) {
            console.log('❌ La tabla fluxcore_signals NO existe');
            return;
        }
        
        // 2. Obtener estructura de columnas
        const columns = await db.execute(sql`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = 'fluxcore_signals'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 ESTRUCTURA DE COLUMNAS:');
        console.log('-'.repeat(80));
        columns.forEach((col: any) => {
            console.log(`  ${col.column_name}: ${col.data_type}` + 
                `${col.is_nullable === 'NO' ? ' NOT NULL' : ''}` +
                `${col.column_default ? ' DEFAULT ' + col.column_default : ''}`);
        });
        
        // 3. Contar registros
        const count = await db.execute(sql`SELECT COUNT(*) FROM fluxcore_signals`);
        console.log(`\n📊 Total registros: ${count[0]?.count}`);
        
        // 4. Mostrar últimos 3 registros si existen
        if (parseInt(count[0]?.count) > 0) {
            const records = await db.execute(sql`
                SELECT sequence_number, signal_id, fact_type, 
                       subject_namespace, subject_key,
                       claimed_occurred_at, certified_at
                FROM fluxcore_signals 
                ORDER BY sequence_number DESC 
                LIMIT 3
            `);
            console.log('\n📄 ÚLTIMOS 3 REGISTROS:');
            console.log(JSON.stringify(records, null, 2));
        }
        
        // 5. Verificar índices
        const indexes = await db.execute(sql`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'fluxcore_signals'
        `);
        console.log('\n🔎 ÍNDICES:');
        indexes.forEach((idx: any) => {
            console.log(`  - ${idx.indexname}`);
        });
        
        // 6. Verificar constraints
        const constraints = await db.execute(sql`
            SELECT conname, contype, pg_get_constraintdef(oid) as def
            FROM pg_constraint
            WHERE conrelid = 'fluxcore_signals'::regclass
        `);
        console.log('\n🔒 CONSTRAINTS:');
        constraints.forEach((cons: any) => {
            const type = cons.contype === 'p' ? 'PRIMARY KEY' : 
                        cons.contype === 'u' ? 'UNIQUE' : 
                        cons.contype === 'f' ? 'FOREIGN KEY' : cons.contype;
            console.log(`  - ${cons.conname} (${type})`);
        });
        
    } catch (err: any) {
        console.error('❌ Error:', err.message);
    }
    
    process.exit(0);
}

inspectTable();
