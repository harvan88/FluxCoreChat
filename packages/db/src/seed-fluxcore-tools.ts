import { db } from './connection';
import { fluxcoreToolDefinitions } from './schema';

async function seedFluxCoreTools() {
  console.log('🧰 Verificando tool definitions de FluxCore...');

  const existing = await db.select({ slug: fluxcoreToolDefinitions.slug }).from(fluxcoreToolDefinitions);
  const existingSlugs = new Set(existing.map((e) => e.slug));

  const definitions = [
    {
      slug: 'file_search',
      name: 'Búsqueda en archivos',
      description: 'Permite buscar información en archivos y documentos indexados.',
      category: 'storage',
      icon: 'file-text',
      type: 'internal',
      visibility: 'public',
      schema: null,
      authType: 'none',
      oauthProvider: null,
      isBuiltIn: true,
      isEnabled: true,
    },
    {
      slug: 'web_search',
      name: 'Búsqueda web',
      description: 'Permite consultar información pública en la web (si está habilitado por el sistema).',
      category: 'research',
      icon: 'globe',
      type: 'internal',
      visibility: 'public',
      schema: null,
      authType: 'none',
      oauthProvider: null,
      isBuiltIn: true,
      isEnabled: true,
    },
    {
      slug: 'calendar',
      name: 'Calendario',
      description: 'Integración con calendario para crear y consultar eventos.',
      category: 'agenda',
      icon: 'calendar',
      type: 'internal',
      visibility: 'public',
      schema: null,
      authType: 'none',
      oauthProvider: null,
      isBuiltIn: true,
      isEnabled: true,
    },
  ] as const;

  const toInsert = definitions.filter((d) => !existingSlugs.has(d.slug));

  if (toInsert.length === 0) {
    console.log('✅ Tool definitions ya existen');
    return;
  }

  await db.insert(fluxcoreToolDefinitions).values(toInsert as any);
  console.log(`✅ Insertadas ${toInsert.length} tool definition(s)`);
}

seedFluxCoreTools()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
