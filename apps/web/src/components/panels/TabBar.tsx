/**
 * TabBar - Barra de pestañas para Dynamic Container
 * TOTEM PARTE 11: Tab navigation
 * 
 * Controles de header: [📌] [⤢] [×]
 * - Pin: Fijar container
 * - Maximize: Expandir/restaurar
 * - Close: Cerrar container
 */

import { useState } from 'react';
import { Pin, PinOff, Maximize2, Minimize2, X } from 'lucide-react';
import clsx from 'clsx';
import { usePanelStore, useContainers } from '../../store/panelStore';

import type { Tab, DynamicContainer } from '../../types/panels';

interface TabBarProps {
  container: DynamicContainer;
}

export function TabBar({ container }: TabBarProps) {
  const { 
    activateTab, 
    closeTab, 
    moveTab, 
    pinContainer, 
    closeContainer,
    minimizeContainer,
  } = usePanelStore();
  const containers = useContainers();
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

  const handleMaximizeToggle = () => {
    minimizeContainer(container.id, !container.minimized);
  };

  const handleCloseContainer = () => {
    // No permitir cerrar si es el último container
    if (containers.length <= 1) {
      // TODO: Mostrar diálogo "No puedes cerrar el último container"
      return;
    }
    closeContainer(container.id);
  };

  return (
    <div 
      className="flex items-center bg-elevated border-b border-subtle h-9 min-h-[36px] max-h-[36px]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Tabs - Bug 2 Fix: Mostrar scrollbar cuando hay overflow */}
      <div className="flex-1 flex items-center overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-subtle scrollbar-track-transparent">
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

      {/* Container Actions - Esquina superior derecha: [📌] [⤢] [×] */}
      <div className="flex items-center px-2 gap-0.5">
        {/* Pin Button */}
        <button
          onClick={handlePinToggle}
          className={clsx(
            'w-7 h-7 flex items-center justify-center rounded transition-colors',
            container.pinned
              ? 'text-accent bg-accent-muted'
              : 'text-muted hover:text-primary hover:bg-hover'
          )}
          title={container.pinned ? 'Desfijar panel' : 'Fijar panel'}
        >
          {container.pinned ? <Pin size={14} /> : <PinOff size={14} />}
        </button>

        {/* Maximize/Minimize Button */}
        <button
          onClick={handleMaximizeToggle}
          className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-primary hover:bg-hover transition-colors"
          title={container.minimized ? 'Restaurar panel' : 'Minimizar panel'}
        >
          {container.minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>

        {/* Close Button */}
        <button
          onClick={handleCloseContainer}
          className={clsx(
            'w-7 h-7 flex items-center justify-center rounded transition-colors',
            containers.length <= 1
              ? 'text-muted cursor-not-allowed opacity-50'
              : 'text-muted hover:text-error hover:bg-hover'
          )}
          title={containers.length <= 1 ? 'No puedes cerrar el último panel' : 'Cerrar panel'}
          disabled={containers.length <= 1}
        >
          <X size={14} />
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
  const displayIcon = tab.icon ?? (tab.type === 'chat' ? '✉️' : null);
  const maxTitleChars = tab.type === 'chat' ? 5 : 18;
  const displayTitle =
    tab.title.length > maxTitleChars ? `${tab.title.slice(0, maxTitleChars)}…` : tab.title;

  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={clsx(
        'group flex items-center gap-2 px-3 py-1.5 min-w-0 max-w-[180px]',
        'border-r border-subtle cursor-pointer select-none',
        'transition-all duration-200',
        isActive 
          ? 'bg-surface text-primary border-b-2 border-b-[var(--accent-primary)]' 
          : 'text-secondary hover:text-primary hover:bg-hover',
        isDragging && 'opacity-50'
      )}
      title={tab.title}
    >
      {/* Icon */}
      {displayIcon && (
        <span className="text-sm flex-shrink-0">{displayIcon}</span>
      )}
      
      {/* Title */}
      <span className="truncate text-sm" title={tab.title}>{displayTitle}</span>
      
      {/* Dirty Indicator */}
      {tab.dirty && (
        <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
      )}
      
      {/* Close Button - visible on hover */}
      {tab.closable && (
        <button
          onClick={onClose}
          className="opacity-0 group-hover:opacity-100 ml-auto p-0.5 rounded hover:bg-active transition-opacity flex-shrink-0"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
