import { FileText } from 'lucide-react';
import type { Instruction } from '../../../types/fluxcore';
import { formatDate, formatSize } from '../../../lib/fluxcore';
import { CollectionView, StatusBadge, EntityActions } from '../shared';
import type { CollectionColumn } from '../shared/CollectionView';

interface InstructionListProps {
  instructions: Instruction[];
  loading: boolean;
  onCreate: () => void;
  onSelect: (instruction: Instruction) => void;
  onDelete: (instructionId: string) => void;
}

const columns: CollectionColumn<Instruction>[] = [
  {
    id: 'name',
    header: 'Nombre',
    accessor: (row) => (
      <div className="flex items-center gap-2 min-w-0">
        <FileText size={16} className="text-accent flex-shrink-0" />
        <span className="font-medium text-primary truncate">{row.name}</span>
      </div>
    ),
  },
  {
    id: 'assistant',
    header: 'Asistente',
    hideBelow: 'md',
    accessor: () => <span className="text-secondary">-</span>,
  },
  {
    id: 'status',
    header: 'Estado',
    accessor: (row) => <StatusBadge status={row.status} />,
  },
  {
    id: 'updatedAt',
    header: 'Última modificación',
    hideBelow: 'lg',
    accessor: (row) => (
      <span className="text-secondary text-sm">
        {formatDate(row.updatedAt)}
        {row.lastModifiedBy && ` ${row.lastModifiedBy}`}
      </span>
    ),
  },
  {
    id: 'size',
    header: 'Tamaño',
    hideBelow: 'lg',
    accessor: (row) => (
      <span className="text-secondary text-sm">
        {formatSize(row.sizeBytes)} - {row.tokensEstimated} tokens
      </span>
    ),
  },
];

export function InstructionList({ instructions, loading, onCreate, onSelect, onDelete }: InstructionListProps) {
  return (
    <CollectionView<Instruction>
      icon={FileText}
      title="Instrucciones del sistema"
      createLabel="Crear instrucciones"
      onCreate={onCreate}
      data={instructions}
      getRowKey={(row) => row.id}
      columns={columns}
      loading={loading}
      onRowClick={onSelect}
      emptyDescription="Crea instrucciones del sistema para guiar a tus asistentes"

      renderActions={(row) => (
        <EntityActions
          onShare={() => {}}
          onDownload={() => {}}
          onRefresh={() => {}}
          onDelete={() => onDelete(row.id)}
        />
      )}
    />
  );
}
