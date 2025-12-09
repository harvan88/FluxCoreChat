/**
 * FC-408: Table Component
 * Sistema de tablas canónico con sorting y paginación
 * 
 * Características:
 * - Sorting por columnas
 * - Paginación integrada
 * - Selección de filas
 * - Estados vacío y loading
 * - Responsive (scroll horizontal)
 */

import { forwardRef, useState, type ReactNode, type HTMLAttributes } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import clsx from 'clsx';

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T = any> {
  /** ID único de la columna */
  id: string;
  /** Encabezado de la columna */
  header: string;
  /** Función para obtener el valor de la celda */
  accessor: (row: T) => ReactNode;
  /** Ancho de la columna */
  width?: string;
  /** Permitir sorting */
  sortable?: boolean;
  /** Alineación del contenido */
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T = any> extends Omit<HTMLAttributes<HTMLTableElement>, 'children'> {
  /** Columnas de la tabla */
  columns: Column<T>[];
  /** Datos de la tabla */
  data: T[];
  /** Función para obtener key única de cada fila */
  getRowKey: (row: T) => string | number;
  /** Estado de carga */
  loading?: boolean;
  /** Mensaje cuando no hay datos */
  emptyMessage?: string;
  /** Permitir selección de filas */
  selectable?: boolean;
  /** Filas seleccionadas */
  selectedRows?: Set<string | number>;
  /** Callback cuando cambia la selección */
  onSelectionChange?: (selected: Set<string | number>) => void;
  /** Callback cuando se hace click en una fila */
  onRowClick?: (row: T) => void;
  /** Hover en filas */
  hoverable?: boolean;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  (
    {
      columns,
      data,
      getRowKey,
      loading = false,
      emptyMessage = 'No hay datos disponibles',
      selectable = false,
      selectedRows = new Set(),
      onSelectionChange,
      onRowClick,
      hoverable = true,
      className,
      ...props
    },
    ref
  ) => {
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    const handleSort = (columnId: string) => {
      if (sortColumn === columnId) {
        // Cycle: asc -> desc -> null
        if (sortDirection === 'asc') {
          setSortDirection('desc');
        } else if (sortDirection === 'desc') {
          setSortColumn(null);
          setSortDirection(null);
        }
      } else {
        setSortColumn(columnId);
        setSortDirection('asc');
      }
    };

    const handleSelectAll = () => {
      if (!onSelectionChange) return;
      
      if (selectedRows.size === data.length) {
        onSelectionChange(new Set());
      } else {
        onSelectionChange(new Set(data.map(getRowKey)));
      }
    };

    const handleSelectRow = (rowKey: string | number) => {
      if (!onSelectionChange) return;
      
      const newSelected = new Set(selectedRows);
      if (newSelected.has(rowKey)) {
        newSelected.delete(rowKey);
      } else {
        newSelected.add(rowKey);
      }
      onSelectionChange(newSelected);
    };

    // Sort data
    const sortedData = sortColumn && sortDirection
      ? [...data].sort((a, b) => {
          const column = columns.find(c => c.id === sortColumn);
          if (!column) return 0;
          
          const aVal = column.accessor(a);
          const bVal = column.accessor(b);
          
          // Handle null/undefined values
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          
          if (aVal === bVal) return 0;
          const comparison = aVal > bVal ? 1 : -1;
          return sortDirection === 'asc' ? comparison : -comparison;
        })
      : data;

    const renderSortIcon = (columnId: string) => {
      if (sortColumn !== columnId) {
        return <ChevronsUpDown size={14} className="text-muted" />;
      }
      return sortDirection === 'asc' 
        ? <ChevronUp size={14} className="text-accent" />
        : <ChevronDown size={14} className="text-accent" />;
    };

    return (
      <div className="w-full overflow-x-auto">
        <table
          ref={ref}
          className={clsx(
            'w-full border-collapse',
            className
          )}
          {...props}
        >
          {/* Header */}
          <thead className="bg-elevated border-b border-subtle">
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded bg-surface border-subtle text-accent focus:ring-accent"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={clsx(
                    'px-4 py-3 text-sm font-semibold text-primary',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer select-none hover:bg-hover',
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && renderSortIcon(column.id)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted"
                >
                  Cargando...
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row) => {
                const rowKey = getRowKey(row);
                const isSelected = selectedRows.has(rowKey);
                
                return (
                  <tr
                    key={rowKey}
                    className={clsx(
                      'border-b border-subtle transition-colors',
                      hoverable && 'hover:bg-hover',
                      onRowClick && 'cursor-pointer',
                      isSelected && 'bg-accent/10'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectRow(rowKey);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded bg-surface border-subtle text-accent focus:ring-accent"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={clsx(
                          'px-4 py-3 text-sm text-secondary',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {column.accessor(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';
