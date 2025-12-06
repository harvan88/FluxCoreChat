export type ContextPermission =
  | 'read:context.public'
  | 'read:context.private'
  | 'read:context.relationship'
  | 'read:context.history'
  | 'read:context.overlay'
  | 'write:context.overlay'
  | 'read:messages'
  | 'write:enrichments'
  | 'send:messages'
  | 'modify:automation'
  | 'tools:register';

export interface PermissionRequest {
  permission: ContextPermission;
  reason: string;
}

export interface PermissionGrant {
  extensionId: string;
  accountId: string;
  permission: ContextPermission;
  grantedAt: Date;
}
