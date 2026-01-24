import { Plus, FileText, Share2, Download, RotateCcw } from 'lucide-react';
import { Button, Badge, DoubleConfirmationDeleteButton } from '../../ui';
import type { Instruction } from '../../../types/fluxcore';
import { formatDate, formatSize } from '../../../lib/fluxcore';

interface InstructionListProps {
  instructions: Instruction[];
  loading: boolean;
  onCreate: () => void;
  onSelect: (instruction: Instruction) => void;
  onDelete: (instructionId: string) => void;
}

const renderStatusBadge = (status: Instruction['status']) => {
  switch (status) {
    case 'active':
      return <Badge variant="success">Activo</Badge>;
    case 'disabled':
      return <Badge variant="warning">Desactivado</Badge>;
    default:
      return <Badge variant="info">Borrador</Badge>;
  }
};

export function InstructionList({ instructions, loading, onCreate, onSelect, onDelete }: InstructionListProps) {
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <FileText size={48} className="text-muted mb-4" />
      <h3 className="text-lg font-medium text-primary mb-2">No hay instrucciones configuradas</h3>
      <p className="text-secondary mb-4">Crea instrucciones del sistema para guiar a tus asistentes</p>
      <Button onClick={onCreate}>
        <Plus size={16} className="mr-1" />
        Crear instrucciones
      </Button>
    </div>
  );

  const renderTable = () => (
    <div className="bg-surface rounded-lg border border-subtle">
      <table className="w-full">
        <thead>
          <tr className="border-b border-subtle">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Nombre</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden md:table-cell">Asistente</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Estado</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden lg:table-cell">Última modificación</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase hidden lg:table-cell">Tamaño</th>
            <th className="px-4 py-3 sticky right-0 bg-surface" />
          </tr>
        </thead>
        <tbody>
          {instructions.map((instruction) => (
            <tr
              key={instruction.id}
              className="group border-b border-subtle last:border-b-0 hover:bg-hover cursor-pointer"
              onClick={() => onSelect(instruction)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-accent flex-shrink-0 min-w-[16px] min-h-[16px]" />
                    <span className="font-medium text-primary truncate">{instruction.name}</span>
                  </div>

                  <div className="flex items-center gap-1 md:hidden">
                    <button className="p-1 hover:bg-elevated rounded" title="Compartir" onClick={(e) => e.stopPropagation()}>
                      <Share2 size={16} className="text-muted" />
                    </button>
                    <button className="p-1 hover:bg-elevated rounded" title="Descargar" onClick={(e) => e.stopPropagation()}>
                      <Download size={16} className="text-muted" />
                    </button>

                    <div className="flex items-center gap-3 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 hover:bg-elevated rounded" title="Descargar" onClick={(e) => e.stopPropagation()}>
                        <Download size={16} className="text-muted flex-shrink-0" />
                      </button>

                      <DoubleConfirmationDeleteButton onConfirm={() => onDelete(instruction.id)} size={16} />
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-secondary hidden md:table-cell">-</td>
              <td className="px-4 py-3">{renderStatusBadge(instruction.status)}</td>
              <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                {formatDate(instruction.updatedAt)}
                {instruction.lastModifiedBy && ` ${instruction.lastModifiedBy}`}
              </td>
              <td className="px-4 py-3 text-secondary text-sm hidden lg:table-cell">
                {formatSize(instruction.sizeBytes)} - {instruction.tokensEstimated} tokens
              </td>
              <td className="px-4 py-3 hidden md:table-cell sticky right-0 bg-surface group-hover:bg-hover">
                <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button className="p-1 hover:bg-elevated rounded" title="Compartir" onClick={(e) => e.stopPropagation()}>
                    <Share2 size={16} className="text-muted flex-shrink-0" />
                  </button>
                  <button className="p-1 hover:bg-elevated rounded" title="Descargar" onClick={(e) => e.stopPropagation()}>
                    <Download size={16} className="text-muted flex-shrink-0" />
                  </button>
                  <button className="p-1 hover:bg-elevated rounded" title="Recargar" onClick={(e) => e.stopPropagation()}>
                    <RotateCcw size={16} className="text-muted flex-shrink-0" />
                  </button>

                  <DoubleConfirmationDeleteButton onConfirm={() => onDelete(instruction.id)} size={16} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">Instrucciones del sistema</h2>
        <Button size="sm" onClick={onCreate}>
          <Plus size={16} className="mr-1" />
          Crear instrucciones
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted">Cargando instrucciones...</div>
        ) : instructions.length === 0 ? (
          renderEmptyState()
        ) : (
          renderTable()
        )}
      </div>
    </div>
  );
}
