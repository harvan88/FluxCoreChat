import { fluxPolicyContextService } from '../services/flux-policy-context.service';
import { capabilityRegistryService } from '../services/capability-registry.service';
import { capabilityOfferService } from '../services/capability-offer.service';

const ACCOUNT_ID = '5f96c4c5-473b-4574-93ce-53f54225dd18';

async function test() {
  console.log('🔍 Probando Soberanía de Herramientas para Fluxi (Canon v8.3)...\n');
  
  try {
    // 1. Resolvemos el contexto completo (Política + Configuración de Runtime)
    // Usamos resolveContext para obtener ambas estructuras
    const { policyContext, runtimeConfig } = await fluxPolicyContextService.resolveContext(
      ACCOUNT_ID,
      '00000000-0000-0000-0000-000000000000', // contactId
      'web' // channel
    );

    console.log(`✅ Contexto resuelto para la cuenta: ${ACCOUNT_ID}`);
    console.log(`🤖 Runtime detectado: ${runtimeConfig.runtimeId}`);
    console.log(`📂 Plantillas en Política: ${policyContext.authorizedTemplates.length}`);
    console.log(`🛠️  Tools en Runtime (Base): ${runtimeConfig.authorizedTools?.length || 0}`);
    
    // 2. Filtramos las capacidades (Lo que Fluxi "puede hacer" tras pasar por el OfferService)
    const allDefinitions = capabilityRegistryService.listDefinitions();
    
    // El CapabilityOfferService decide qué herramientas mostrar al modelo basándose en el contexto
    const available = allDefinitions.filter(def => 
      (capabilityOfferService as any).isAvailable(def, {
        runtimeConfig: runtimeConfig,
        authorizedContext: policyContext
      })
    );

    console.log('\n🛠️  INVENTARIO FINAL DE HERRAMIENTAS (OFERTA A LA IA):');
    if (available.length === 0) {
      console.log('❌ No hay herramientas disponibles. Revisa los Switches en la UI.');
    } else {
      available.forEach(tool => {
        const domainIcon = tool.domain === 'fluxcore' ? '🛡️' : '💬';
        const authStatus = (runtimeConfig.authorizedTools || []).includes(tool.name) ? ' [AUTORIZADA]' : ' [SOBERANA]';
        console.log(`${domainIcon} [${tool.domain.toUpperCase()}] ${tool.name}${authStatus}`);
        console.log(`   Description: ${tool.description}\n`);
      });
    }

    // 3. Verificación de Soberanía de Plataforma
    const hasPlatformTools = available.some(t => t.domain === 'fluxcore' && t.name.startsWith('platform_'));
    console.log(`📊 RESULTADO DE SOBERANÍA: ${hasPlatformTools ? '🔥 EXITOSA (Fluxi tiene herramientas de gestión)' : '⚠️ FALLIDA'}`);

  } catch (error: any) {
    console.error('❌ Error durante la prueba:', error.message);
    console.error(error.stack);
  }
}

test();
