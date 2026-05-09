export interface RouteDefinition {
  id: string;
  pattern: string;
  activity: string;
  tabType?: string;
  subView?: string;

  // Metadata para apertura automática de tabs
  container?: string;
  defaultTitle?: string;
  defaultIcon?: string;
  identityPrefix?: string;
  supportsMulti?: boolean;
  contextBuilder?: string;
  navLevel?: 2 | 3;
}

/**
 * Construye el objeto context para un tab dado su tipo y recurso.
 * Este es el ÚNICO lugar donde se define la forma del contexto por tipo.
 */
export function buildTabContext(
  contextBuilder: string | undefined,
  resourceId: string,
  accountId: string | null
): Record<string, any> {
  switch (contextBuilder) {
    case 'chat':
      return { id: resourceId, chatId: resourceId };
    case 'template':
      return { id: resourceId, templateId: resourceId, accountId };
    case 'settings':
      return { section: resourceId };
    case 'location':
      return { locationId: resourceId, accountId };
    case 'extension':
      return { accountId };
    case 'fluxcore_assistant':
      return { assistantId: resourceId, runtime: 'openai', accountId, extensionId: '@fluxcore/asistentes', view: 'assistant' };
    case 'fluxcore_instruction':
      return { instructionId: resourceId, accountId, extensionId: '@fluxcore/asistentes', view: 'instruction' };
    case 'fluxcore_vector_store':
      return { vectorStoreId: resourceId, accountId, extensionId: '@fluxcore/asistentes', view: 'vector-store' };
    case 'fluxcore_tool':
      return { toolId: resourceId, accountId, extensionId: '@fluxcore/asistentes', view: 'tool' };
    case 'fluxcore_agent':
      return { agentId: resourceId, accountId, extensionId: '@fluxcore/asistentes', view: 'agent' };
    case 'fluxcore_work':
      return { workId: resourceId, accountId, extensionId: '@fluxcore/asistentes', view: 'work' };
    case 'fluxcore_proposed_work':
      return { proposedWorkId: resourceId, accountId, extensionId: '@fluxcore/asistentes', view: 'proposed-work' };
    case 'fluxcore_definition':
      return { definitionId: resourceId, accountId, extensionId: '@fluxcore/asistentes', view: 'wes-studio' };
    default:
      return { id: resourceId, accountId };
  }
}

/**
 * Iconos especiales para secciones de configuración.
 */
const SETTINGS_ICONS: Record<string, string> = {
  profile: 'User',
  accounts: 'Building',
  notifications: 'Bell',
  privacy: 'Shield',
  appearance: 'Palette',
  kernel: 'Shield',
  credits: 'Zap',
  contacto: 'Share2',
  ubicacion: 'MapPin',
  horario: 'Clock',
};

/**
 * Títulos especiales para secciones de configuración.
 */
const SETTINGS_TITLES: Record<string, string> = {
  profile: 'Perfil',
  accounts: 'Cuentas',
  notifications: 'Notificaciones',
  privacy: 'Privacidad',
  appearance: 'Apariencia',
  kernel: 'Kernel',
  credits: 'Créditos',
  contacto: 'Contacto',
  ubicacion: 'Ubicación',
  horario: 'Horarios',
};

/**
 * Resuelve el título de un tab. Para settings usa un mapa de títulos,
 * para chats intenta buscar el nombre del contacto.
 */
export function resolveTabTitle(
  route: RouteDefinition,
  resourceId: string,
  conversations?: any[]
): string {
  if (route.contextBuilder === 'settings') {
    return SETTINGS_TITLES[resourceId] || route.defaultTitle || 'Ajustes';
  }
  if (route.contextBuilder === 'location') {
    return `Sede: ${resourceId}`; // Fallback si no tenemos el nombre
  }
  if (route.contextBuilder === 'chat' && conversations) {
    const conv = conversations.find(c => c.id === resourceId);
    if (conv) return (conv as any).contactName || route.defaultTitle || 'Chat';
  }
  return route.defaultTitle || 'Tab';
}

/**
 * Resuelve el icono de un tab. Para settings usa un mapa de iconos para 
 * heredar el icono semántico del sidebar.
 */
export function resolveTabIcon(
  route: RouteDefinition,
  resourceId: string
): string {
  if (route.contextBuilder === 'settings') {
    return SETTINGS_ICONS[resourceId] || route.defaultIcon || 'Settings';
  }
  return route.defaultIcon || 'File';
}

export const ROUTE_REGISTRY: readonly RouteDefinition[] = [
  // Conversaciones
  { id: 'conversations', pattern: '/mensajes', activity: 'conversations' },
  { id: 'conversations.detail', pattern: '/mensajes/:id', activity: 'conversations',
    tabType: 'chat', container: 'chats', defaultTitle: 'Chat',
    defaultIcon: 'MessageCircle', identityPrefix: 'chat',
    supportsMulti: true, contextBuilder: 'chat' },

  // Contactos
  { id: 'contacts', pattern: '/contactos', activity: 'contacts' },
  { id: 'contacts.detail', pattern: '/contactos/:id', activity: 'contacts', tabType: 'contact_detail' },

  // Herramientas
  { id: 'tools', pattern: '/herramientas', activity: 'tools' },
  { id: 'tools.templates', pattern: '/herramientas/plantillas', activity: 'tools',
    tabType: 'template-panel', container: 'editor', defaultTitle: 'Plantillas',
    defaultIcon: 'FileText', identityPrefix: 'template-panel',
    contextBuilder: 'extension', navLevel: 2 },
  { id: 'tools.detail', pattern: '/herramientas/:id', activity: 'tools',
    tabType: 'template-editor', container: 'editor', defaultTitle: 'Plantilla',
    defaultIcon: 'FileText', identityPrefix: 'template-editor',
    supportsMulti: true, contextBuilder: 'template', navLevel: 3 },

  // Extensiones
  { id: 'extensions', pattern: '/extensiones', activity: 'extensions' },

  // Configuraciones
  { id: 'settings', pattern: '/ajustes', activity: 'settings' },
  { id: 'settings.detail', pattern: '/ajustes/:id', activity: 'settings',
    tabType: 'settings', container: 'settings', defaultTitle: 'Ajustes',
    defaultIcon: 'Settings', identityPrefix: 'settings',
    contextBuilder: 'settings', navLevel: 2 },
  { id: 'settings.location.detail', pattern: '/ajustes/ubicacion/:id', activity: 'settings',
    tabType: 'location-detail', container: 'settings', defaultTitle: 'Sede',
    defaultIcon: 'MapPin', identityPrefix: 'location',
    contextBuilder: 'location', navLevel: 3 },

  // Monitoreo
  { id: 'monitoring', pattern: '/monitoreo', activity: 'monitoring',
    tabType: 'monitoring', container: 'dashboard', defaultTitle: 'Kernel Console',
    defaultIcon: 'Activity', identityPrefix: 'monitoring',
    contextBuilder: 'extension' },

  // FluxCore (Extensión Dinámica) - Vistas base
  { id: 'fluxcore', pattern: '/fluxcore', activity: 'ext:@fluxcore/asistentes' },
  { id: 'fluxcore-legacy', pattern: '/fluxcore', activity: 'ext:fluxcore' },
  
  { id: 'fluxcore.usage', pattern: '/fluxcore/uso', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'usage', defaultTitle: 'Uso', defaultIcon: 'BarChart3', navLevel: 2 },
  { id: 'fluxcore.assistants', pattern: '/fluxcore/asistentes', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'assistants', defaultTitle: 'Asistentes', defaultIcon: 'Bot', navLevel: 2 },
  { id: 'fluxcore.instructions', pattern: '/fluxcore/Instrucciones_del_sistema', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'instructions', defaultTitle: 'Instrucciones', defaultIcon: 'FileText', navLevel: 2 },
  { id: 'fluxcore.knowledge', pattern: '/fluxcore/base_de_conocimiento', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'knowledge-base', defaultTitle: 'Base de conocimiento', defaultIcon: 'Database', navLevel: 2 },
  { id: 'fluxcore.tools', pattern: '/fluxcore/herramientas', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'tools', defaultTitle: 'Herramientas', defaultIcon: 'Wrench', navLevel: 2 },
  { id: 'fluxcore.tools-alias', pattern: '/fluxcore/tools', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'tools', defaultTitle: 'Herramientas', defaultIcon: 'Wrench', navLevel: 2 },
  { id: 'fluxcore.agents', pattern: '/fluxcore/agentes', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'agents', defaultTitle: 'Agentes', defaultIcon: 'GitBranch', navLevel: 2 },
  { id: 'fluxcore.debug', pattern: '/fluxcore/depuracion', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'debug', defaultTitle: 'Depuración', defaultIcon: 'Bug', navLevel: 2 },
  { id: 'fluxcore.policies', pattern: '/fluxcore/politicas', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'policies', defaultTitle: 'Políticas', defaultIcon: 'Shield', navLevel: 2 },
  { id: 'fluxcore.billing', pattern: '/fluxcore/facturacion', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'billing', defaultTitle: 'Facturación', defaultIcon: 'CreditCard', navLevel: 2 },
  { id: 'fluxcore.works', pattern: '/fluxcore/fluxi', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'works', defaultTitle: 'Fluxi', defaultIcon: 'LayoutDashboard', navLevel: 2 },
  { id: 'fluxcore.traces', pattern: '/fluxcore/trazas', activity: 'ext:@fluxcore/asistentes', tabType: 'traces', subView: 'traces', defaultTitle: 'Trazas', defaultIcon: 'Activity', navLevel: 2 },

  // FluxCore - Vistas de Detalle
  { id: 'fluxcore.assistant.detail', pattern: '/fluxcore/asistentes/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'Bot',
    defaultIcon: 'Bot', identityPrefix: 'extension:@fluxcore/asistentes:assistant',
    contextBuilder: 'fluxcore_assistant', navLevel: 3 },

  { id: 'fluxcore.instruction.detail', pattern: '/fluxcore/Instrucciones_del_sistema/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'Instrucción',
    defaultIcon: 'FileText', identityPrefix: 'extension:@fluxcore/asistentes:instruction',
    contextBuilder: 'fluxcore_instruction', navLevel: 3 },

  { id: 'fluxcore.knowledge.detail', pattern: '/fluxcore/base_de_conocimiento/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'Database',
    defaultIcon: 'Database', identityPrefix: 'extension:@fluxcore/asistentes:vector-store',
    contextBuilder: 'fluxcore_vector_store', navLevel: 3 },

  { id: 'fluxcore.tool.detail', pattern: '/fluxcore/herramientas/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'Wrench',
    defaultIcon: 'Wrench', identityPrefix: 'extension:@fluxcore/asistentes:tool',
    contextBuilder: 'fluxcore_tool', navLevel: 3 },

  { id: 'fluxcore.agent.detail', pattern: '/fluxcore/agentes/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'GitBranch',
    defaultIcon: 'GitBranch', identityPrefix: 'extension:@fluxcore/asistentes:agent',
    contextBuilder: 'fluxcore_agent', navLevel: 3 },

  { id: 'fluxcore.work.detail', pattern: '/fluxcore/trabajos/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'Zap',
    defaultIcon: 'Zap', identityPrefix: 'extension:@fluxcore/asistentes:work',
    contextBuilder: 'fluxcore_work', navLevel: 3 },

  { id: 'fluxcore.proposed_work.detail', pattern: '/fluxcore/trabajos-propuestos/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'Bot',
    defaultIcon: 'Bot', identityPrefix: 'extension:@fluxcore/asistentes:proposed-work',
    contextBuilder: 'fluxcore_proposed_work', navLevel: 3 },

  { id: 'fluxcore.definition.detail', pattern: '/fluxcore/wes-studio/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'WesStudio',
    defaultIcon: 'Settings', identityPrefix: 'extension:@fluxcore/asistentes:definition',
    contextBuilder: 'fluxcore_definition', navLevel: 3 },
] as const;

/**
 * Construye una URL limpia inyectando los parámetros en el patrón.
 */
export const buildRoute = (routeId: string, params?: Record<string, string>): string => {
  const route = ROUTE_REGISTRY.find(r => r.id === routeId);
  if (!route) return '/';

  let path = route.pattern;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, value);
    });
  }
  return path;
};
