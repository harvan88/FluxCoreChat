// Tipos para el frontend de FluxCore

export interface User {
  id: string;
  email: string;
  name: string;
  systemAdminScopes?: Record<string, boolean> | null;
}

export type AccountDeletionJobStatus =
  | 'pending'
  | 'snapshot'
  | 'snapshot_ready'
  | 'external_cleanup'
  | 'local_cleanup'
  | 'completed'
  | 'failed';

export interface AccountDeletionJob {
  id: string;
  accountId: string;
  requesterUserId: string;
  requesterAccountId?: string | null;
  status: AccountDeletionJobStatus;
  phase: string;
  snapshotUrl?: string | null;
  snapshotReadyAt?: string | null;
  snapshotDownloadedAt?: string | null;
  snapshotDownloadCount?: number | null;
  snapshotAcknowledgedAt?: string | null;
  externalState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountDeletionLog {
  id: string;
  accountId: string;
  jobId?: string | null;
  requesterUserId?: string | null;
  requesterAccountId?: string | null;
  status: string;
  reason?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AccountDataReference {
  tableName: string;
  columnName: string;
  rowCount: number;
}

export interface AccountOrphanReference {
  tableName: string;
  columnName: string;
  orphanCount: number;
  sampleIds: string[];
}

export interface Account {
  id: string;
  ownerUserId: string;
  username: string;
  displayName: string;
  accountType: 'personal' | 'business';
  profile: Record<string, any>;
  privateContext?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id: string;
  accountAId: string;
  accountBId: string;
  perspectiveA: Perspective;
  perspectiveB: Perspective;
  context: RelationshipContext;
  createdAt: string;
  lastInteraction?: string;
}

export interface Perspective {
  savedName?: string;
  tags: string[];
  status: 'active' | 'archived' | 'blocked';
}

export interface RelationshipContext {
  entries: ContextEntry[];
  totalChars: number;
}

export interface ContextEntry {
  authorAccountId: string;
  content: string;
  type: 'note' | 'preference' | 'rule';
  createdAt: string;
}

export interface Conversation {
  id: string;
  relationshipId: string;
  channel: 'web' | 'whatsapp' | 'telegram';
  status: 'active' | 'archived' | 'closed';
  lastMessageAt?: string;
  lastMessageText?: string;
  unreadCountA: number;
  unreadCountB: number;
  createdAt: string;
  updatedAt: string;
}

export type MessageStatus = 'local_only' | 'pending_backend' | 'synced' | 'sent' | 'delivered' | 'seen' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderAccountId: string;
  content: MessageContent;
  type: 'incoming' | 'outgoing' | 'system';
  generatedBy: 'human' | 'ai';
  status?: MessageStatus;
  replyToId?: string;
  aiApprovedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MessageContent {
  text?: string;
  media?: MediaItem[];
  buttons?: Button[];
}

export interface MediaItem {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  attachmentId?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  waveformData?: any;
  name?: string;
}

export interface Button {
  id: string;
  text: string;
  action: string;
}

// Auth types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Activity types for sidebar
// Extensiones dinámicas usan el formato 'ext:{extensionId}'
export type ActivityType = 'conversations' | 'contacts' | 'extensions' | 'settings' | 'monitoring' | `ext:${string}`;

// Extension UI configuration from manifest
export interface ExtensionUIConfig {
  sidebar?: {
    icon: string;
    title: string;
  };
  panel?: {
    title: string;
    component: string;
  };
}

// UI State
export interface UIState {
  activeActivity: ActivityType;
  sidebarOpen: boolean;
  selectedConversationId: string | null;
  selectedAccountId: string | null;
}
