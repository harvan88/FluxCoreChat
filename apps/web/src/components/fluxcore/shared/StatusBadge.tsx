import { Badge } from '../../ui';
import type { AssistantStatus, InstructionStatus, VectorStoreStatus } from '../../../types/fluxcore';

type AnyStatus = AssistantStatus | InstructionStatus | VectorStoreStatus | string;

interface StatusBadgeProps {
    status: AnyStatus;
    className?: string;
}

/**
 * StatusBadge - Componente unificado para mostrar estados en FluxCore
 * 
 * Centraliza la lógica de colores y textos para los estados de:
 * - Asistentes (draft, active, disabled)
 * - Instrucciones (draft, active, disabled)
 * - Vector Stores (draft, active, expired)
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
    switch (status) {
        case 'active':
            return <Badge variant="success" className={className}>Activo</Badge>;
        case 'disabled':
            return <Badge variant="warning" className={className}>Desactivado</Badge>;
        case 'expired':
            return <Badge variant="error" className={className}>Expirado</Badge>;
        case 'draft':
            return <Badge variant="info" className={className}>Borrador</Badge>;
        default:
            return <Badge variant="warning" className={className}>{status}</Badge>;
    }
}

export default StatusBadge;
