import React from 'react';
import { useAutomation } from '../../hooks/useAutomation';
import { AIStatusIndicator } from './AIStatusIndicator';
import type { AutomationMode } from '../../hooks/useAutomation';

interface ConversationRowAIStatusProps {
  accountId: string;
  relationshipId: string;
  isFluxCoreEnabled: boolean;
}

export function ConversationRowAIStatus({
  accountId,
  relationshipId,
  isFluxCoreEnabled
}: ConversationRowAIStatusProps) {
  // Now this hook uses useAutomationStore internally, so it's performant!
  const { currentMode, setRule, isLoading } = useAutomation(accountId, relationshipId);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Ciclo: auto -> suggest -> off -> auto
    const modes: AutomationMode[] = ['auto', 'suggest', 'off'];
    const currentIndex = modes.indexOf(currentMode as AutomationMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    void setRule(nextMode, { relationshipId });
  };

  return (
    <div className="flex items-center" onClick={e => e.stopPropagation()}>
      <AIStatusIndicator
        mode={currentMode as AutomationMode}
        isFluxCoreEnabled={isFluxCoreEnabled}
        isLoading={isLoading}
        onToggle={handleToggle}
      />
    </div>
  );
}
