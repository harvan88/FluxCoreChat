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
    case 'extension':
      return { accountId };
    case 'fluxcore_assistant':
      return { assistantId: resourceId, runtime: 'openai', accountId };
    case 'fluxcore_instruction':
      return { instructionId: resourceId, accountId };
    case 'fluxcore_vector_store':
      return { vectorStoreId: resourceId, accountId };
    case 'fluxcore_tool':
      return { toolId: resourceId, accountId };
    case 'fluxcore_agent':
      return { agentId: resourceId, accountId };
    case 'fluxcore_work':
      return { workId: resourceId, accountId };
    case 'fluxcore_proposed_work':
      return { proposedWorkId: resourceId, accountId };
    case 'fluxcore_definition':
      return { definitionId: resourceId, accountId };
    default:
      return { id: resourceId, accountId };
  }
}

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
    return SETTINGS_TITLES[resourceId] || route.defaultTitle || 'Configuración';
  }
  if (route.contextBuilder === 'chat' && conversations) {
    const conv = conversations.find(c => c.id === resourceId);
    if (conv) return (conv as any).contactName || route.defaultTitle || 'Chat';
  }
  return route.defaultTitle || 'Tab';
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
    tabType: 'template_panel', container: 'editor', defaultTitle: 'Plantillas',
    defaultIcon: 'FileText', identityPrefix: 'template-panel',
    contextBuilder: 'extension' },
  { id: 'tools.detail', pattern: '/herramientas/:id', activity: 'tools',
    tabType: 'template_editor', container: 'editor', defaultTitle: 'Plantilla',
    defaultIcon: 'FileText', identityPrefix: 'template-panel',
    supportsMulti: true, contextBuilder: 'template' },

  // Extensiones
  { id: 'extensions', pattern: '/extensiones', activity: 'extensions' },

  // Configuraciones
  { id: 'settings', pattern: '/configuracion', activity: 'settings' },
  { id: 'settings.detail', pattern: '/configuracion/:id', activity: 'settings',
    tabType: 'settings', container: 'settings', defaultTitle: 'Configuración',
    defaultIcon: 'Settings', identityPrefix: 'settings',
    contextBuilder: 'settings' },

  // Monitoreo
  { id: 'monitoring', pattern: '/monitoreo', activity: 'monitoring',
    tabType: 'monitoring', container: 'dashboard', defaultTitle: 'Kernel Console',
    defaultIcon: 'Activity', identityPrefix: 'monitoring',
    contextBuilder: 'extension' },

  // FluxCore (Extensión Dinámica) - Vistas base
  { id: 'fluxcore', pattern: '/fluxcore', activity: 'ext:@fluxcore/asistentes' },
  { id: 'fluxcore-legacy', pattern: '/fluxcore', activity: 'ext:fluxcore' },
  
  { id: 'fluxcore.usage', pattern: '/fluxcore/uso', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'usage', defaultTitle: 'Uso', defaultIcon: 'BarChart3' },
  { id: 'fluxcore.assistants', pattern: '/fluxcore/asistentes', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'assistants', defaultTitle: 'Asistentes', defaultIcon: 'Bot' },
  { id: 'fluxcore.instructions', pattern: '/fluxcore/Instrucciones_del_sistema', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'instructions', defaultTitle: 'Instrucciones', defaultIcon: 'FileText' },
  { id: 'fluxcore.knowledge', pattern: '/fluxcore/base_de_conocimiento', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'knowledge-base', defaultTitle: 'Base de conocimiento', defaultIcon: 'Database' },
  { id: 'fluxcore.tools', pattern: '/fluxcore/herramientas', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'tools', defaultTitle: 'Herramientas', defaultIcon: 'Wrench' },
  { id: 'fluxcore.tools-alias', pattern: '/fluxcore/tools', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'tools', defaultTitle: 'Herramientas', defaultIcon: 'Wrench' },
  { id: 'fluxcore.agents', pattern: '/fluxcore/agentes', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'agents', defaultTitle: 'Agentes', defaultIcon: 'GitBranch' },
  { id: 'fluxcore.debug', pattern: '/fluxcore/depuracion', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'debug', defaultTitle: 'Depuración', defaultIcon: 'Bug' },
  { id: 'fluxcore.policies', pattern: '/fluxcore/politicas', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'policies', defaultTitle: 'Políticas', defaultIcon: 'Shield' },
  { id: 'fluxcore.billing', pattern: '/fluxcore/facturacion', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'billing', defaultTitle: 'Facturación', defaultIcon: 'CreditCard' },
  { id: 'fluxcore.works', pattern: '/fluxcore/fluxi', activity: 'ext:@fluxcore/asistentes', tabType: 'extension', subView: 'works', defaultTitle: 'Fluxi', defaultIcon: 'LayoutDashboard' },
  { id: 'fluxcore.traces', pattern: '/fluxcore/trazas', activity: 'ext:@fluxcore/asistentes', tabType: 'traces', subView: 'traces', defaultTitle: 'Trazas', defaultIcon: 'Activity' },

  // FluxCore - Vistas de Detalle
  { id: 'fluxcore.assistant.detail', pattern: '/fluxcore/asistentes/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'Bot',
    defaultIcon: 'Bot', identityPrefix: 'extension:@fluxcore/asistentes:assistant',
    contextBuilder: 'fluxcore_assistant' },

  { id: 'fluxcore.instruction.detail', pattern: '/fluxcore/Instrucciones_del_sistema/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'FileText',
    defaultIcon: 'FileText', identityPrefix: 'extension:@fluxcore/asistentes:instruction',
    contextBuilder: 'fluxcore_instruction' },

  { id: 'fluxcore.knowledge.detail', pattern: '/fluxcore/base_de_conocimiento/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'Database',
    defaultIcon: 'Database', identityPrefix: 'extension:@fluxcore/asistentes:vector-store',
    contextBuilder: 'fluxcore_vector_store' },

  { id: 'fluxcore.tool.detail', pattern: '/fluxcore/herramientas/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'Wrench',
    defaultIcon: 'Wrench', identityPrefix: 'extension:@fluxcore/asistentes:tool',
    contextBuilder: 'fluxcore_tool' },

  { id: 'fluxcore.agent.detail', pattern: '/fluxcore/agentes/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'GitBranch',
    defaultIcon: 'GitBranch', identityPrefix: 'extension:@fluxcore/asistentes:agent',
    contextBuilder: 'fluxcore_agent' },

  { id: 'fluxcore.work.detail', pattern: '/fluxcore/trabajos/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'Zap',
    defaultIcon: 'Zap', identityPrefix: 'extension:@fluxcore/asistentes:work',
    contextBuilder: 'fluxcore_work' },

  { id: 'fluxcore.proposed_work.detail', pattern: '/fluxcore/trabajos-propuestos/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'Bot',
    defaultIcon: 'Bot', identityPrefix: 'extension:@fluxcore/asistentes:proposed-work',
    contextBuilder: 'fluxcore_proposed_work' },

  { id: 'fluxcore.definition.detail', pattern: '/fluxcore/wes-studio/:id', activity: 'ext:@fluxcore/asistentes',
    tabType: 'extension', container: 'extensions', defaultTitle: 'WesStudio',
    defaultIcon: 'Settings', identityPrefix: 'extension:@fluxcore/asistentes:definition',
    contextBuilder: 'fluxcore_definition' },
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
