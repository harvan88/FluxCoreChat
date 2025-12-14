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
  | 'tools:register'
  // Karen Website Builder permissions
  | 'read:website'
  | 'write:website'
  | 'public:website';

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
