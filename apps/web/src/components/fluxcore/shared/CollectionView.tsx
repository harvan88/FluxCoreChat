/**
 * CollectionView — Single Source of Truth for FluxCore collection layouts.
 *
 * Every service tab (Instructions, Assistants, VectorStores, Tools, Agents)
 * renders its list through this component to guarantee visual consistency.
 *
 * Structure:
 *   Header  → icon + title + count + create button (slots)
 *   Content → LoadingState | EmptyState | Table
 *   Table   → columns (with responsive breakpoints) + sticky actions column
 *
 * The actions column is a render-prop slot so each service can inject its own
 * buttons (activate, share, download, etc.) while keeping consistent spacing,
 * opacity transitions, and the canonical DoubleConfirmationDeleteButton.
 */

import { type ReactNode, type ElementType, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import clsx from 'clsx';
import { ViewHeader, Table, ActionSheet } from '../../ui';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';

// ─── Column Definition ──────────────────────────────────────────────────────

export interface CollectionColumn<T> {
  /** Unique column id */
  id: string;
  /** Header text (rendered uppercase automatically) */
  header: string;
  /** Accessor — returns the cell content */
  accessor: (row: T) => ReactNode;
  /** Responsive breakpoint: hidden below this size */
  hideBelow?: 'md' | 'lg';
  /** Column min-width hint */
  width?: string;
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface CollectionViewProps<T> {
  /** Lucide icon component for the header and empty state */
  icon: ElementType;
  /** Collection title shown in the header */
  title: string;
  /** Label for the create button */
  createLabel?: string;
  /** Callback when the create button is clicked */
  onCreate?: () => void;
  /** Data array */
  data: T[];
  /** Unique key extractor per row */
  getRowKey: (row: T) => string;
  /** Column definitions */
  columns: CollectionColumn<T>[];
  /** Whether data is loading */
  loading: boolean;
  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Empty-state description text */
  emptyDescription?: string;
  /**
   * Render-prop for the sticky actions column on each row.
   * Receives the row and should return action buttons.
   * Wrap individual buttons with onClick stopPropagation.
   */
  renderActions?: (row: T) => ReactNode;

  /** Extra class on the outermost wrapper */
  className?: string;
  /** Optional: override the create button variant */
  createVariant?: 'primary' | 'secondary';
  /** Optional: Custom mobile item renderer */
  renderMobileItem?: (row: T) => ReactNode;
  /** Optional: Actions for the ActionSheet (mobile only) */
  mobileActions?: (row: T) => Array<{
    id: string;
    label: string;
    icon?: any;
    onClick: () => void;
    variant?: 'default' | 'danger';
  }>;
  /** Optional: Extra actions to show in the header */
  headerActions?: ReactNode;
  /** Optional: Filter bar to show between header and content */
  filterBar?: ReactNode;
}

// ─── Responsive class helpers ───────────────────────────────────────────────

const hideBelowClass = (bp?: 'md' | 'lg') => {
  if (bp === 'md') return 'hidden md:table-cell';
  if (bp === 'lg') return 'hidden lg:table-cell';
  return '';
};

// ─── Component ──────────────────────────────────────────────────────────────

export function CollectionView<T>({
  icon: Icon,
  title,
  createLabel,
  onCreate,
  data,
  getRowKey,
  columns,
  loading,
  onRowClick,
  emptyDescription,
  renderActions,
  className,
  createVariant = 'primary',
  renderMobileItem,
  mobileActions,
  headerActions,
  filterBar,
}: CollectionViewProps<T>) {
  const [activeActionSheetRow, setActiveActionSheetRow] = useState<T | null>(null);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading && data.length === 0) {
    return (
      <div className={clsx('h-full flex flex-col', className)}>
        <ViewHeader
          icon={Icon}
          title={title}
          count={0}
          createLabel={createLabel}
          onCreate={onCreate}
          createVariant={createVariant}
        />
        <div className="flex-1 overflow-auto p-6">
          <LoadingState message={`Cargando ${title.toLowerCase()}...`} />
        </div>
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────
  if (!loading && data.length === 0) {
    return (
      <div className={clsx('h-full flex flex-col', className)}>
        <ViewHeader
          icon={Icon}
          title={title}
          count={0}
          createLabel={createLabel}
          onCreate={onCreate}
          createVariant={createVariant}
        />
        <div className="flex-1 overflow-auto p-6">
          <EmptyState
            icon={<Icon size={48} />}
            title={`No hay ${title.toLowerCase()}`}
            description={emptyDescription || `Crea un elemento para comenzar`}
            actionLabel={createLabel}
            onAction={onCreate}
          />
        </div>
      </div>
    );
  }

  // ── Table ───────────────────────────────────────────────────────────────
  return (
    <div className={clsx('h-full flex flex-col', className)}>
      <ViewHeader
        icon={Icon}
        title={title}
        count={data.length}
        createLabel={createLabel}
        onCreate={onCreate}
        createVariant={createVariant}
      >
        {headerActions}
      </ViewHeader>

      {filterBar}

      {/* VISTA DESKTOP: TABLA */}
      <div className="hidden md:block flex-1 overflow-auto p-6">
        <div className="bg-surface rounded-xl border border-subtle overflow-hidden">
          <Table
            data={data}
            columns={[
              ...columns.map(col => ({
                id: col.id,
                header: col.header,
                accessor: (row: T) => (
                  <div className="min-w-0">{col.accessor(row)}</div>
                ),
                width: col.width,
                className: hideBelowClass(col.hideBelow),
                sortable: true
              })),
              ...(renderActions ? [{
                id: 'actions',
                header: '',
                accessor: (row: T) => (
                  <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    {renderActions(row)}
                  </div>
                ),
                sticky: 'right' as const,
                className: 'hidden md:table-cell',
                align: 'right' as const
              }] : [])
            ]}
            getRowKey={getRowKey}
            onRowClick={onRowClick}
            loading={loading}
            emptyMessage={emptyDescription}
            hoverable={true}
            showBorders={true}
            stickyHeader={true}
          />
        </div>
      </div>

      {/* VISTA MOBILE: LISTA */}
      <div className="md:hidden flex-1 overflow-y-auto divide-y divide-subtle/10 pb-20">
        {data.map((row) => (
          <div key={getRowKey(row)} className="active:bg-hover transition-colors">
            {renderMobileItem ? (
              renderMobileItem(row)
            ) : (
              <div 
                className="flex items-center gap-4 p-4"
                onClick={() => onRowClick?.(row)}
              >
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-primary truncate">
                    {/* Default to first column content */}
                    {columns[0]?.accessor(row)}
                  </div>
                  {columns[1] && (
                    <div className="text-xs text-secondary truncate mt-0.5">
                      {columns[1].accessor(row)}
                    </div>
                  )}
                </div>
                {mobileActions && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveActionSheetRow(row);
                    }}
                    className="p-2 text-muted active:text-primary transition-colors"
                  >
                    <MoreVertical size={20} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MOBILE ACTION SHEET */}
      {mobileActions && activeActionSheetRow && (
        <ActionSheet
          isOpen={!!activeActionSheetRow}
          onClose={() => setActiveActionSheetRow(null)}
          title="Opciones"
          items={mobileActions(activeActionSheetRow)}
        />
      )}
    </div>
  );
}


// ─── Re-exports for convenience ─────────────────────────────────────────────

export { StatusBadge } from './StatusBadge';
export { EntityActions } from './EntityActions';

export default CollectionView;
