/**
 * FC-827: InvitationsList
 * FC-828: AcceptInvitation (inline)
 * Lista de invitaciones pendientes
 */

import { useState, useEffect } from 'react';
import {
  Mail,
  Clock,
  X,
  Check,
  Loader2,
  Building2,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Card, Badge, Button } from '../ui';
import type { WorkspaceInvitation } from '../../services/workspaces';

// ============================================================================
// FC-827: Invitations List (for workspace owners/admins)
// ============================================================================

interface InvitationsListProps {
  workspaceId: string;
  canManage?: boolean;
}

export function InvitationsList({ workspaceId, canManage = false }: InvitationsListProps) {
  const { invitations, isLoading, loadInvitations, cancelInvitation } = useWorkspaceStore();

  useEffect(() => {
    if (workspaceId) loadInvitations(workspaceId);
  }, [workspaceId, loadInvitations]);

  const pendingInvitations = invitations.filter((i) => i.status === 'pending');

  if (isLoading && invitations.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
      </div>
    );
  }

  if (pendingInvitations.length === 0) {
    return (
      <div className="text-center py-4 text-muted text-sm">
        No hay invitaciones pendientes
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pendingInvitations.map((invitation) => (
        <InvitationCard
          key={invitation.id}
          invitation={invitation}
          canCancel={canManage}
          onCancel={async () => {
            await cancelInvitation(workspaceId, invitation.id);
          }}
        />
      ))}
    </div>
  );
}

interface InvitationCardProps {
  invitation: WorkspaceInvitation;
  canCancel: boolean;
  onCancel: () => Promise<void>;
}

function InvitationCard({ invitation, canCancel, onCancel }: InvitationCardProps) {
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (confirm('¿Cancelar esta invitación?')) {
      setIsCancelling(true);
      await onCancel();
      setIsCancelling(false);
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    operator: 'Operador',
    viewer: 'Visualizador',
  };

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-secondary">
          <Mail size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-primary text-sm font-medium truncate">
            {invitation.email}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Badge variant="neutral" size="sm">
              {roleLabels[invitation.role] || invitation.role}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              Pendiente
            </span>
          </div>
        </div>
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="p-2 text-muted hover:text-error hover:bg-hover rounded transition-colors disabled:opacity-50"
            title="Cancelar invitación"
          >
            {isCancelling ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
          </button>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// FC-828: Accept Invitation (for invited users)
// ============================================================================

interface AcceptInvitationProps {
  invitation: WorkspaceInvitation;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function AcceptInvitation({ invitation, onAccept, onDecline }: AcceptInvitationProps) {
  const { acceptInvitation, isLoading, error } = useWorkspaceStore();
  const [status, setStatus] = useState<'pending' | 'accepting' | 'accepted' | 'error'>('pending');

  const handleAccept = async () => {
    setStatus('accepting');
    const success = await acceptInvitation(invitation.token);
    if (success) {
      setStatus('accepted');
      onAccept?.();
    } else {
      setStatus('error');
    }
  };

  if (status === 'accepted') {
    return (
      <Card className="p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-success/20 rounded-full flex items-center justify-center">
          <Check className="w-6 h-6 text-success" />
        </div>
        <h3 className="text-lg font-semibold text-primary">¡Te has unido!</h3>
        <p className="text-sm text-muted mt-2">
          Ahora eres parte de {invitation.workspace?.name || 'el workspace'}.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-inverse">
          <Building2 size={24} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-primary">
            Invitación a colaborar
          </h3>
          <p className="text-sm text-secondary">
            {invitation.workspace?.name || 'Workspace'}
          </p>
        </div>
      </div>

      <p className="text-secondary text-sm mb-4">
        Has sido invitado como <strong>{invitation.role}</strong> a este workspace.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="primary"
          onClick={handleAccept}
          disabled={isLoading || status === 'accepting'}
          className="flex-1"
        >
          {status === 'accepting' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Check size={16} className="mr-1.5" />
              Aceptar
            </>
          )}
        </Button>
        {onDecline && (
          <Button variant="ghost" onClick={onDecline}>
            Rechazar
          </Button>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// FC-829: Pending Invitations Indicator (for header)
// ============================================================================

interface PendingInvitationsIndicatorProps {
  onClick?: () => void;
}

export function PendingInvitationsIndicator({ onClick }: PendingInvitationsIndicatorProps) {
  const { pendingInvitations, loadPendingInvitations } = useWorkspaceStore();

  useEffect(() => {
    loadPendingInvitations();
  }, [loadPendingInvitations]);

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-secondary hover:text-primary hover:bg-hover rounded-lg transition-colors"
      title={`${pendingInvitations.length} invitación(es) pendiente(s)`}
    >
      <Mail size={20} />
      <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-inverse text-xs font-bold rounded-full flex items-center justify-center">
        {pendingInvitations.length}
      </span>
    </button>
  );
}
