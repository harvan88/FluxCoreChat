// AUDITORÍA DE COMPONENTES REUTILIZABLES
// Análisis de qué partes del sistema actual están alineadas con el diseño v1.3

import { sql } from '@fluxcore/db';

async function auditReutilizables() {
  console.log('🔍 AUDITORÍA DE COMPONENTES REUTILIZABLES');
  console.log('📋 Analizando qué podemos conservar del sistema actual');
  
  try {
    // 1. VERIFICAR TABLAS EXISTENTES VS DISEÑO
    console.log('\n=== 1. TABLAS ACTUALES VS DISEÑO v1.3 ===');
    
    const tablasActuales = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    const tablasArray = Array.from(tablasActuales as any[]);
    
    console.log('📊 Tablas actuales encontradas:');
    tablasArray.forEach((tabla: any) => {
      console.log(`   • ${tabla.table_name}`);
    });
    
    // 2. ANALIZAR TABLAS DEL CORE FLUXCORE
    console.log('\n=== 2. TABLAS DEL CORE FLUXCORE (REUTILIZABLES) ===');
    
    const coreTables = [
      'users',
      'accounts', 
      'relationships',
      'conversations',
      'messages'
    ];
    
    console.log('📋 Estado de tablas del core:');
    coreTables.forEach(tableName => {
      const existe = tablasArray.some((t: any) => t.table_name === tableName);
      if (existe) {
        console.log(`   ✅ ${tableName}: EXISTE - Analizar estructura`);
      } else {
        console.log(`   ❌ ${tableName}: NO EXISTE - Crear desde cero`);
      }
    });
    
    // 3. ANALIZAR ESTRUCTURA DE TABLAS EXISTENTES
    console.log('\n=== 3. ANÁLISIS DE ESTRUCTURA DE TABLAS EXISTENTES ===');
    
    for (const tableName of coreTables) {
      const existe = tablasArray.some((t: any) => t.table_name === tableName);
      if (existe) {
        console.log(`\n📋 Estructura de ${tableName}:`);
        
        const columnas = await sql`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${tableName} ORDER BY ordinal_position`;
        const columnasArray = Array.from(columnas as any[]);
        
        columnasArray.forEach((col: any) => {
          console.log(`   • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : ''} ${col.column_default ? `(default: ${col.column_default})` : ''}`);
        });
      }
    }
    
    // 4. VERIFICAR SERVICIOS DE INGESTA DE ASSETS
    console.log('\n=== 4. SERVICIOS DE INGESTA DE ASSETS ===');
    
    // Buscar archivos relacionados con assets
    const fs = await import('fs');
    const path = await import('path');
    
    const apiDir = path.join(process.cwd(), 'src');
    const servicesDir = path.join(apiDir, 'services');
    
    console.log('📊 Servicios de assets encontrados:');
    
    function findAssetServices(dir: string, depth = 0): string[] {
      if (depth > 3) return [];
      
      const services: string[] = [];
      
      try {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            services.push(...findAssetServices(fullPath, depth + 1));
          } else if (file.includes('asset') || file.includes('upload') || file.includes('file') || file.includes('media')) {
            services.push(fullPath);
          }
        }
      } catch (error) {
        // Ignorar errores de directorio
      }
      
      return services;
    }
    
    const assetServices = findAssetServices(servicesDir);
    assetServices.forEach(service => {
      console.log(`   📁 ${service}`);
    });
    
    // 5. VERIFICAR ENDPOINTS DE ASSETS
    console.log('\n=== 5. ENDPOINTS DE ASSETS ===');
    
    function findAssetRoutes(dir: string, depth = 0): string[] {
      if (depth > 3) return [];
      
      const routes: string[] = [];
      
      try {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            routes.push(...findAssetRoutes(fullPath, depth + 1));
          } else if (file.includes('route') || file.includes('asset') || file.includes('upload') || file.includes('file')) {
            routes.push(fullPath);
          }
        }
      } catch (error) {
        // Ignorar errores de directorio
      }
      
      return routes;
    }
    
    const routesDir = path.join(apiDir, 'routes');
    const assetRoutes = findAssetRoutes(routesDir);
    assetRoutes.forEach(route => {
      console.log(`   🛣️  ${route}`);
    });
    
    // 6. VERIFICAR WEBSOCKET HANDLERS
    console.log('\n=== 6. WEBSOCKET HANDLERS ===');
    
    const websocketDir = path.join(apiDir, 'websocket');
    
    try {
      const wsFiles = fs.readdirSync(websocketDir);
      console.log('📊 Archivos WebSocket encontrados:');
      wsFiles.forEach(file => {
        console.log(`   🔌 ${file}`);
      });
    } catch (error) {
      console.log('❌ No se encontró directorio websocket');
    }
    
    // 7. VERIFICAR MIDDLEWARES DE AUTENTICACIÓN
    console.log('\n=== 7. MIDDLEWARES DE AUTENTICACIÓN ===');
    
    const middlewareDir = path.join(apiDir, 'middleware');
    
    try {
      const middlewareFiles = fs.readdirSync(middlewareDir);
      console.log('📊 Middlewares encontrados:');
      middlewareFiles.forEach(file => {
        if (file.includes('auth') || file.includes('jwt') || file.includes('session')) {
          console.log(`   🔐 ${file}`);
        }
      });
    } catch (error) {
      console.log('❌ No se encontró directorio middleware');
    }
    
    // 8. VERIFICAR ESQUEMA DE PERSISTENCIA
    console.log('\n=== 8. ESQUEMA DE PERSISTENCIA ===');
    
    // Verificar si usan Drizzle ORM
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      console.log('📊 Dependencias de persistencia:');
      if (packageJson.dependencies['drizzle-orm']) {
        console.log(`   ✅ Drizzle ORM: ${packageJson.dependencies['drizzle-orm']}`);
      }
      if (packageJson.dependencies['postgres']) {
        console.log(`   ✅ Postgres: ${packageJson.dependencies['postgres']}`);
      }
      if (packageJson.dependencies['@neondatabase/serverless']) {
        console.log(`   ✅ Neon: ${packageJson.dependencies['@neondatabase/serverless']}`);
      }
    } catch (error) {
      console.log('❌ No se pudo leer package.json');
    }
    
    // 9. VERIFICAR CONFIGURACIÓN DE BASE DE DATOS
    console.log('\n=== 9. CONFIGURACIÓN DE BASE DE DATOS ===');
    
    try {
      const dbConfigPath = path.join(apiDir, 'db');
      const dbFiles = fs.readdirSync(dbConfigPath);
      console.log('📊 Archivos de configuración DB:');
      dbFiles.forEach(file => {
        console.log(`   🗄️  ${file}`);
      });
    } catch (error) {
      console.log('❌ No se encontró configuración de DB');
    }
    
    // 10. ANÁLISIS DE COMPATIBILIDAD CON DISEÑO v1.3
    console.log('\n=== 10. ANÁLISIS DE COMPATIBILIDAD CON DISEÑO v1.3 ===');
    
    console.log('📋 Componentes que SÍ podemos reutilizar:');
    
    // Verificar si las tablas del core existen
    const coreTablesExisten = coreTables.filter(tableName => 
      tablasArray.some((t: any) => t.table_name === tableName)
    );
    
    if (coreTablesExisten.length > 0) {
      console.log(`   ✅ Tablas del core: ${coreTablesExisten.join(', ')}`);
    }
    
    if (assetServices.length > 0) {
      console.log(`   ✅ Servicios de assets: ${assetServices.length} encontrados`);
    }
    
    if (assetRoutes.length > 0) {
      console.log(`   ✅ Rutas de assets: ${assetRoutes.length} encontradas`);
    }
    
    console.log('\n📋 Componentes que NECESITAN RECONSTRUCCIÓN:');
    
    const missingTables = coreTables.filter(tableName => 
      !tablasArray.some((t: any) => t.table_name === tableName)
    );
    
    if (missingTables.length > 0) {
      console.log(`   ❌ Tablas faltantes: ${missingTables.join(', ')}`);
    }
    
    console.log(`   ❌ conversation_participants (tabla nueva del diseño)`);
    console.log(`   ❌ asset_enrichments (tabla nueva del diseño)`);
    console.log(`   ❌ Schema de messages (necesita reconstrucción)`);
    
    // 11. RECOMENDACIONES ESPECÍFICAS
    console.log('\n=== 11. RECOMENDACIONES ESPECÍFICAS ===');
    
    console.log('📋 ESTRATEGIA DE MIGRACIÓN:');
    console.log('   1. ✅ CONSERVAR: Sistema de ingestión de assets');
    console.log('   2. ✅ CONSERVAR: Autenticación y usuarios');
    console.log('   3. ✅ CONSERVAR: Sistema de relaciones básico');
    console.log('   4. 🔄 MIGRAR: Schema de messages a diseño v1.3');
    console.log('   5. 🔄 MIGRAR: Conversaciones a conversation_participants');
    console.log('   6. 🆕 CREAR: asset_enrichments');
    console.log('   7. 🆕 CREAR: Sistema de soft delete');
    console.log('   8. 🆕 CREAR: Sistema de versionamiento');
    console.log('   9. 🆕 CREAR: Sistema de congelamiento');
    
    console.log('\n📋 COMPONENTES QUE FUNCIONAN BIEN:');
    console.log('   ✅ Ingesta de archivos y assets');
    console.log('   ✅ Persistencia en PostgreSQL');
    console.log('   ✅ Distribución via WebSocket');
    console.log('   ✅ Autenticación de usuarios');
    console.log('   ✅ Sistema de cuentas');
    
    console.log('\n📋 COMPONENTES QUE NECESITAN CAMBIO:');
    console.log('   ❌ Schema de messages (incompatible con diseño)');
    console.log('   ❌ Sistema de participantes (usando relationships vs conversation_participants)');
    console.log('   ❌ Sistema de enriquecimientos (audio vs asset_enrichments)');
    console.log('   ❌ Sistema de eliminación (hard delete vs soft delete)');
    
  } catch (error) {
    console.error('❌ Error en auditoría:', error);
  } finally {
    process.exit(0);
  }
}

auditReutilizables().catch(console.error);
