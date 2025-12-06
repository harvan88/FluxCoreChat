/**
 * TabBar - Barra de pestañas para Dynamic Container
 * TOTEM PARTE 11: Tab navigation
 */

import { useState } from 'react';
import { usePanelStore } from '../../store/panelStore';
import type { Tab, DynamicContainer } from '../../types/panels';

interface TabBarProps {
  container: DynamicContainer;
}

export function TabBar({ container }: TabBarProps) {
  const { activateTab, closeTab, moveTab, pinContainer } = usePanelStore();
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

  const handleTabClick = (tabId: string) => {
    activateTab(container.id, tabId);
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(container.id, tabId);
  };

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTabId(tabId);
    e.dataTransfer.setData('text/plain', JSON.stringify({
      tabId,
      fromContainerId: container.id,
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.fromContainerId !== container.id) {
        moveTab(data.tabId, data.fromContainerId, container.id);
      }
    } catch {
      // Invalid drop data
    }
    setDraggedTabId(null);
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
  };

  const handlePinToggle = () => {
    pinContainer(container.id, !container.pinned);
  };

  return (
    <div 
      className="flex items-center bg-gray-800 border-b border-gray-700 h-9"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Tabs */}
      <div className="flex-1 flex items-center overflow-x-auto scrollbar-hide">
        {container.tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === container.activeTabId}
            isDragging={tab.id === draggedTabId}
            onClick={() => handleTabClick(tab.id)}
            onClose={(e) => handleCloseTab(e, tab.id)}
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {/* Container Actions */}
      <div className="flex items-center px-2 gap-1">
        {/* Pin Button */}
        <button
          onClick={handlePinToggle}
          className={`p-1 rounded hover:bg-gray-700 transition-colors ${
            container.pinned ? 'text-yellow-400' : 'text-gray-500'
          }`}
          title={container.pinned ? 'Desfijar panel' : 'Fijar panel'}
        >
          <PinIcon pinned={container.pinned} />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Tab Item Component
// ============================================================================

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  isDragging: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function TabItem({
  tab,
  isActive,
  isDragging,
  onClick,
  onClose,
  onDragStart,
  onDragEnd,
}: TabItemProps) {
  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`
        group flex items-center gap-2 px-3 py-1.5 min-w-0 max-w-[180px]
        border-r border-gray-700 cursor-pointer select-none
        transition-colors
        ${isActive 
          ? 'bg-gray-900 text-white border-b-2 border-b-blue-500' 
          : 'text-gray-400 hover:text-white hover:bg-gray-750'
        }
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* Icon */}
      {tab.icon && (
        <span className="text-sm">{tab.icon}</span>
      )}
      
      {/* Title */}
      <span className="truncate text-sm">{tab.title}</span>
      
      {/* Dirty Indicator */}
      {tab.dirty && (
        <span className="w-2 h-2 rounded-full bg-white" />
      )}
      
      {/* Close Button */}
      {tab.closable && (
        <button
          onClick={onClose}
          className="opacity-0 group-hover:opacity-100 ml-auto p-0.5 rounded hover:bg-gray-600 transition-opacity"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function CloseIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PinIcon({ pinned }: { pinned: boolean }) {
  if (pinned) {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
    </svg>
  );
}
