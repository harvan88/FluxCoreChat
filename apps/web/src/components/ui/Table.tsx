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
  /** Truncar contenido con puntos suspensivos */
  truncate?: boolean;
  /** Clase CSS adicional para la columna (útil para responsive) */
  className?: string;
  /** Columna fija (izquierda o derecha) */
  sticky?: 'left' | 'right';
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
  /** Mostrar bordes entre filas */
  showBorders?: boolean;
  /** Encabezado fijo al hacer scroll */
  stickyHeader?: boolean;
  /** Modo compacto con menos padding */
  dense?: boolean;
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
      showBorders = true,
      stickyHeader = true,
      dense = false,
      className,
      ...props
    },
    ref
  ) => {
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    const handleSort = (columnId: string) => {
      if (sortColumn === columnId) {
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

    const sortedData = sortColumn && sortDirection
      ? [...data].sort((a, b) => {
          const column = columns.find(c => c.id === sortColumn);
          if (!column) return 0;
          
          const aVal = column.accessor(a);
          const bVal = column.accessor(b);
          
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
        return <ChevronsUpDown size={14} className="text-muted opacity-30" />;
      }
      return sortDirection === 'asc' 
        ? <ChevronUp size={14} className="text-accent" />
        : <ChevronDown size={14} className="text-accent" />;
    };

    return (
      <div className="w-full relative">
        <table
          ref={ref}
          className={clsx(
            'w-full border-collapse text-left min-w-[800px]', 
            className
          )}
          {...props}
        >
          {/* Header */}
          <thead className={clsx(
            'z-10',
            stickyHeader && 'sticky top-0'
          )}>
            <tr>
              {selectable && (
                <th className={clsx(
                  'px-4 py-3 w-12 bg-surface',
                  dense && 'py-2 px-3',
                  showBorders && 'border-b border-subtle'
                )}>
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
                    'px-4 py-3 text-[13px] text-muted bg-surface transition-colors',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer select-none hover:text-primary',
                    dense && 'py-2 px-3',
                    showBorders && 'border-b border-subtle',
                    column.sticky === 'left' && 'sticky left-0 z-30',
                    column.sticky === 'right' && 'sticky right-0 z-30',
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className={clsx(
                    'flex items-center gap-2',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}>
                    <span>{column.header}</span>
                    {column.sortable && renderSortIcon(column.id)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-muted font-medium">Cargando datos...</span>
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-16 text-center text-muted italic text-sm"
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
                      'group transition-colors',
                      showBorders && 'border-b border-subtle last:border-b-0',
                      onRowClick && 'cursor-pointer',
                      hoverable && 'hover:bg-hover',
                      isSelected && 'bg-accent/[0.03]'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className={clsx(
                        'px-4 py-3',
                        dense && 'py-2 px-3'
                      )}>
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
                          'px-4 py-3 text-sm text-secondary transition-colors group-hover:text-primary',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          column.truncate && 'truncate max-w-[200px]', // default max-width for truncation if enabled
                          dense && 'py-2 px-3',
                          column.sticky === 'left' && 'sticky left-0 z-10 bg-surface',
                          column.sticky === 'right' && 'sticky right-0 z-10 bg-surface',
                          column.className
                        )}
                      >
                        {column.truncate && typeof column.accessor(row) === 'string' ? (
                          <div className="truncate" title={column.accessor(row) as string}>
                            {column.accessor(row)}
                          </div>
                        ) : (
                          column.accessor(row)
                        )}
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
