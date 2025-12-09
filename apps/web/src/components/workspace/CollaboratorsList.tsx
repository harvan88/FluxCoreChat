/**
 * FC-822: CollaboratorsList
 * FC-825: PermissionsSelector (inline)
 * Lista de colaboradores del workspace con gestión de permisos
 */

import { useState, useEffect } from 'react';
import {
  Users,
  MoreVertical,
  Shield,
  Trash2,
  Crown,
  Eye,
  Edit,
  Loader2,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Card, Badge, Button } from '../ui';
import type { WorkspaceMember } from '../../services/workspaces';

interface CollaboratorsListProps {
  workspaceId: string;
  canManage?: boolean;
}

const roleLabels: Record<string, { label: string; color: 'info' | 'success' | 'warning' | 'error' | 'neutral' }> = {
  owner: { label: 'Propietario', color: 'warning' },
  admin: { label: 'Administrador', color: 'info' },
  operator: { label: 'Operador', color: 'success' },
  viewer: { label: 'Visualizador', color: 'neutral' },
};

export function CollaboratorsList({ workspaceId, canManage = false }: CollaboratorsListProps) {
  const { members, isLoading, loadMembers, updateMember, removeMember } = useWorkspaceStore();
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (workspaceId) loadMembers(workspaceId);
  }, [workspaceId, loadMembers]);

  if (isLoading && members.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <Card variant="bordered" className="p-6 text-center">
        <Users size={32} className="mx-auto text-muted mb-2" />
        <p className="text-muted">No hay colaboradores</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <CollaboratorCard
          key={member.id}
          member={member}
          canManage={canManage && member.role !== 'owner'}
          isEditing={editingMemberId === member.id}
          onEdit={() => setEditingMemberId(member.id)}
          onCancelEdit={() => setEditingMemberId(null)}
          onUpdateRole={async (role) => {
            await updateMember(workspaceId, member.userId, { role });
            setEditingMemberId(null);
          }}
          onRemove={async () => {
            await removeMember(workspaceId, member.userId);
            return true;
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Collaborator Card
// ============================================================================

interface CollaboratorCardProps {
  member: WorkspaceMember;
  canManage: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdateRole: (role: string) => Promise<void>;
  onRemove: () => Promise<boolean>;
}

function CollaboratorCard({
  member,
  canManage,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdateRole,
  onRemove,
}: CollaboratorCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const roleInfo = roleLabels[member.role] || roleLabels.viewer;
  const RoleIcon = member.role === 'owner' ? Crown : Shield;

  const handleRemove = async () => {
    if (confirm('¿Estás seguro de remover a este colaborador?')) {
      setIsRemoving(true);
      await onRemove();
      setIsRemoving(false);
    }
  };

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-inverse font-bold">
          {member.user?.name?.charAt(0).toUpperCase() || '?'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-primary font-medium truncate">
              {member.user?.name || 'Usuario'}
            </span>
            <Badge variant={roleInfo.color} size="sm">
              <RoleIcon size={10} className="mr-1" />
              {roleInfo.label}
            </Badge>
          </div>
          <div className="text-sm text-muted truncate">
            {member.user?.email || 'Sin email'}
          </div>
        </div>

        {/* Actions */}
        {canManage && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-muted hover:text-primary hover:bg-hover rounded transition-colors"
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && (
              <MemberActionsMenu
                onEdit={() => {
                  setShowMenu(false);
                  onEdit();
                }}
                onRemove={() => {
                  setShowMenu(false);
                  handleRemove();
                }}
                onClose={() => setShowMenu(false)}
                isRemoving={isRemoving}
              />
            )}
          </div>
        )}
      </div>

      {/* Edit Role (FC-825: PermissionsSelector inline) */}
      {isEditing && (
        <div className="mt-3 pt-3 border-t border-subtle">
          <PermissionsSelector
            currentRole={member.role}
            onSelect={onUpdateRole}
            onCancel={onCancelEdit}
          />
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// Member Actions Menu
// ============================================================================

interface MemberActionsMenuProps {
  onEdit: () => void;
  onRemove: () => void;
  onClose: () => void;
  isRemoving: boolean;
}

function MemberActionsMenu({ onEdit, onRemove, onClose, isRemoving }: MemberActionsMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 bg-elevated border border-default rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
        <button
          onClick={onEdit}
          className="w-full px-3 py-2 flex items-center gap-2 text-sm text-primary hover:bg-hover transition-colors"
        >
          <Edit size={14} />
          Cambiar rol
        </button>
        <button
          onClick={onRemove}
          disabled={isRemoving}
          className="w-full px-3 py-2 flex items-center gap-2 text-sm text-error hover:bg-hover transition-colors disabled:opacity-50"
        >
          {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Remover
        </button>
      </div>
    </>
  );
}

// ============================================================================
// FC-825: Permissions Selector
// ============================================================================

interface PermissionsSelectorProps {
  currentRole: string;
  onSelect: (role: string) => Promise<void>;
  onCancel: () => void;
}

function PermissionsSelector({ currentRole, onSelect, onCancel }: PermissionsSelectorProps) {
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [isUpdating, setIsUpdating] = useState(false);

  const roles = [
    { id: 'admin', label: 'Administrador', description: 'Puede gestionar miembros y configuración', icon: Shield },
    { id: 'operator', label: 'Operador', description: 'Puede ver y usar todas las funciones', icon: Edit },
    { id: 'viewer', label: 'Visualizador', description: 'Solo puede ver el contenido', icon: Eye },
  ];

  const handleSave = async () => {
    if (selectedRole !== currentRole) {
      setIsUpdating(true);
      await onSelect(selectedRole);
      setIsUpdating(false);
    } else {
      onCancel();
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <label
              key={role.id}
              className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                selectedRole === role.id ? 'bg-accent/10 border border-accent' : 'bg-elevated hover:bg-hover'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={role.id}
                checked={selectedRole === role.id}
                onChange={() => setSelectedRole(role.id)}
                className="sr-only"
              />
              <Icon size={18} className={selectedRole === role.id ? 'text-accent' : 'text-muted'} />
              <div className="flex-1">
                <div className={`font-medium text-sm ${selectedRole === role.id ? 'text-primary' : 'text-secondary'}`}>
                  {role.label}
                </div>
                <div className="text-xs text-muted">{role.description}</div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={isUpdating} className="flex-1">
          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : 'Guardar'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
