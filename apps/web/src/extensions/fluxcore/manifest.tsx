/**
 * FluxCore Extension Manifest
 * 
 * FluxCore es una EXTENSIÓN, no parte del núcleo de ChatCore.
 * Este manifest declara las capacidades UI de FluxCore.
 * ChatCore interpreta este manifest y registra las vistas.
 */

import type { ExtensionUIManifest } from '../../core/extension-api/types';
import type { ExtensionViewProps } from '../../core/registry/types';
import { lazy, Suspense, type ComponentType } from 'react';

// ============================================================================
// Lazy-loaded Components
// ============================================================================

const FluxCoreSidebar = lazy(() => 
  import('../../components/fluxcore/FluxCoreSidebar').then(m => ({ default: m.FluxCoreSidebar }))
);

const UsageView = lazy(() => 
  import('../../components/fluxcore/views/UsageView').then(m => ({ default: m.UsageView }))
);

const AssistantsView = lazy(() => 
  import('../../components/fluxcore/views/AssistantsView').then(m => ({ default: m.AssistantsView }))
);

const InstructionsView = lazy(() => 
  import('../../components/fluxcore/views/InstructionsView').then(m => ({ default: m.InstructionsView }))
);

const VectorStoresView = lazy(() => 
  import('../../components/fluxcore/views/VectorStoresView').then(m => ({ default: m.VectorStoresView }))
);

const ToolsView = lazy(() => 
  import('../../components/fluxcore/views/ToolsView').then(m => ({ default: m.ToolsView }))
);

const OpenAIAssistantConfigView = lazy(() => 
  import('../../components/fluxcore/views/OpenAIAssistantConfigView').then(m => ({ default: m.OpenAIAssistantConfigView }))
);

const FluxCorePromptInspectorPanel = lazy(() => 
  import('../../components/extensions/FluxCorePromptInspectorPanel').then(m => ({ default: m.FluxCorePromptInspectorPanel }))
);

// ============================================================================
// Loading Fallback
// ============================================================================

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
    </div>
  );
}

// ============================================================================
// Wrapper Components (adapt to ExtensionViewProps)
// ============================================================================

// Note: withSuspense helper removed - using inline Suspense wrappers instead

// Sidebar wrapper
const FluxCoreSidebarWrapper: ComponentType<ExtensionViewProps> = (props) => {
  // FluxCoreSidebar tiene su propia interfaz, adaptamos
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FluxCoreSidebar 
        activeView="usage"
        onViewChange={() => {}}
        accountName={props.context?.accountName as string || 'FluxCore'}
      />
    </Suspense>
  );
};

// Usage view wrapper
const UsageViewWrapper: ComponentType<ExtensionViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <UsageView accountId={props.accountId} />
  </Suspense>
);

// Assistants view wrapper
const AssistantsViewWrapper: ComponentType<ExtensionViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <AssistantsView accountId={props.accountId} />
  </Suspense>
);

// Instructions view wrapper
const InstructionsViewWrapper: ComponentType<ExtensionViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <InstructionsView accountId={props.accountId} />
  </Suspense>
);

// Vector stores view wrapper
const VectorStoresViewWrapper: ComponentType<ExtensionViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <VectorStoresView accountId={props.accountId} />
  </Suspense>
);

// Tools view wrapper
const ToolsViewWrapper: ComponentType<ExtensionViewProps> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <ToolsView accountId={props.accountId} />
  </Suspense>
);

// OpenAI Assistant config wrapper
const OpenAIAssistantConfigViewWrapper: ComponentType<ExtensionViewProps> = (props) => {
  const assistantId = (props.context?.assistantId as string) || '';
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OpenAIAssistantConfigView 
        accountId={props.accountId}
        assistantId={assistantId}
        onClose={props.onClose || (() => {})}
      />
    </Suspense>
  );
};

// Debug panel wrapper
const DebugPanelWrapper: ComponentType<ExtensionViewProps> = (_props) => (
  <Suspense fallback={<LoadingFallback />}>
    <FluxCorePromptInspectorPanel />
  </Suspense>
);

// ============================================================================
// FluxCore Manifest
// ============================================================================

export const fluxcoreManifest: ExtensionUIManifest = {
  extensionId: '@fluxcore/fluxcore',
  displayName: 'FluxCore AI',
  manifestVersion: 1,
  
  permissions: [
    'ui:sidebar',
    'ui:open_tab',
    'ui:open_container',
  ],
  
  sidebar: {
    icon: 'Bot',
    title: 'FluxCore',
    component: FluxCoreSidebarWrapper,
    priority: 10, // Alta prioridad - aparece cerca del inicio
  },
  
  views: {
    // Vista principal de uso/estadísticas
    'usage': {
      component: UsageViewWrapper,
      defaultTitle: 'Uso',
      defaultIcon: 'BarChart3',
    },
    
    // Lista de asistentes
    'assistants': {
      component: AssistantsViewWrapper,
      defaultTitle: 'Asistentes',
      defaultIcon: 'Bot',
    },
    
    // Alias para compatibilidad
    'assistant': {
      component: AssistantsViewWrapper,
      defaultTitle: 'Asistentes',
      defaultIcon: 'Bot',
    },
    
    // Configuración de asistente OpenAI
    'openai-assistant': {
      component: OpenAIAssistantConfigViewWrapper,
      defaultTitle: 'Configurar Asistente',
      defaultIcon: 'Settings',
    },
    
    // Instrucciones del sistema
    'instructions': {
      component: InstructionsViewWrapper,
      defaultTitle: 'Instrucciones',
      defaultIcon: 'FileText',
    },
    
    // Alias para compatibilidad
    'instruction': {
      component: InstructionsViewWrapper,
      defaultTitle: 'Instrucciones',
      defaultIcon: 'FileText',
    },
    
    // Base de conocimiento (vector stores)
    'knowledge-base': {
      component: VectorStoresViewWrapper,
      defaultTitle: 'Base de Conocimiento',
      defaultIcon: 'Database',
    },
    
    // Alias para compatibilidad
    'vector-store': {
      component: VectorStoresViewWrapper,
      defaultTitle: 'Vector Store',
      defaultIcon: 'Database',
    },
    
    // Herramientas
    'tools': {
      component: ToolsViewWrapper,
      defaultTitle: 'Herramientas',
      defaultIcon: 'Wrench',
    },
    
    // Panel de debug
    'debug': {
      component: DebugPanelWrapper,
      defaultTitle: 'Depuración',
      defaultIcon: 'Bug',
    },
  },
  
  limits: {
    maxTabs: 10,
    maxContainers: 2,
  },
  
  trusted: true, // Extensión oficial
};
