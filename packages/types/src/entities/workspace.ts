export type WorkspaceRole = 'owner' | 'admin' | 'operator' | 'viewer';

export interface WorkspacePermissions {
  canManageMembers?: boolean;
  canConfigureExtensions?: boolean;
  canViewAnalytics?: boolean;
  canRespondToMessages?: boolean;
  [key: string]: boolean | undefined;
}

export interface Workspace {
  id: string;
  ownerAccountId: string;
  name: string;
  createdAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  permissions: WorkspacePermissions;
  createdAt: Date;
}

export interface CreateWorkspaceInput {
  name: string;
}

export interface AddWorkspaceMemberInput {
  userId: string;
  role: WorkspaceRole;
  permissions?: WorkspacePermissions;
}
