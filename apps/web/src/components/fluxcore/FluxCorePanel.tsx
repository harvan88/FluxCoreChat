/**
 * FluxCore Panel
 * 
 * Panel principal de FluxCore que combina el sidebar con el contenido dinámico.
 * Se muestra en el DynamicContainer cuando se selecciona la extensión FluxCore.
 */

import { useState } from 'react';
import { FluxCoreSidebar } from './FluxCoreSidebar';
import { AssistantsView } from './views/AssistantsView';
import { InstructionsView } from './views/InstructionsView';
import { VectorStoresView } from './views/VectorStoresView';
import { ToolsView } from './views/ToolsView';
import { UsageView } from './views/UsageView';
import { FluxCorePromptInspectorPanel } from '../extensions/FluxCorePromptInspectorPanel';
import { FluxCoreView } from '@/types/fluxcore/views.types';

interface FluxCorePanelProps {
  accountId: string;
  accountName?: string;
  onOpenTab?: (tabId: string, title: string, data: any) => void;
}

export function FluxCorePanel({ accountId, accountName, onOpenTab }: FluxCorePanelProps) {
  const [activeView, setActiveView] = useState<FluxCoreView>('assistants');

  const renderContent = () => {
    switch (activeView) {
      case 'usage':
        return <UsageView accountId={accountId} />;
      case 'assistants':
        return <AssistantsView accountId={accountId} onOpenTab={onOpenTab} />;
      case 'instructions':
        return <InstructionsView accountId={accountId} onOpenTab={onOpenTab} />;
      case 'knowledge-base':
      case 'vector-stores':
        return <VectorStoresView accountId={accountId} onOpenTab={onOpenTab} />;
      case 'tools':
        return <ToolsView accountId={accountId} />;
      case 'debug':
        return <FluxCorePromptInspectorPanel accountId={accountId} />;
      case 'billing':
        return (
          <div className="flex-1 flex items-center justify-center text-muted">
            Facturación (próximamente)
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <FluxCoreSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          accountName={accountName}
        />
      </div>

      {/* Content */}
      <div className="flex-1 bg-base overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}

export default FluxCorePanel;
