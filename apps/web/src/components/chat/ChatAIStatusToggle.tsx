import React from 'react';
import { useAutomation } from '../../hooks/useAutomation';
import type { AutomationMode } from '../../hooks/useAutomation';
import { AIStatusIndicator } from '../conversations/AIStatusIndicator';
import { useExtensions } from '../../hooks/useExtensions';

interface ChatAIStatusToggleProps {
  accountId: string;
  relationshipId: string;
}

export function ChatAIStatusToggle({ accountId, relationshipId }: ChatAIStatusToggleProps) {
  const { currentMode, setRule, isLoading } = useAutomation(accountId, relationshipId);
  const { installations } = useExtensions(accountId);
  
  const isFluxCoreEnabled = installations.some(
    (i) => i.extensionId === '@fluxcore/asistentes' && i.enabled
  );

  if (!isFluxCoreEnabled) return null;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const modes: AutomationMode[] = ['auto', 'suggest', 'off'];
    const safeMode = (currentMode as AutomationMode) || 'off';
    const currentIndex = modes.indexOf(safeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    void setRule(nextMode, { relationshipId });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted">IA:</span>
      <AIStatusIndicator
        mode={currentMode as AutomationMode}
        isFluxCoreEnabled={isFluxCoreEnabled}
        isLoading={isLoading}
        onToggle={handleToggle}
      />
    </div>
  );
}
