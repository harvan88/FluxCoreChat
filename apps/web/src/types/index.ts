// Tipos para el frontend de FluxCore

export interface User {
  id: string;
  email: string;
  name: string;
  systemAdminScopes?: Record<string, boolean> | null;
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
export type ActivityType = 'conversations' | 'contacts' | 'extensions' | 'settings' | `ext:${string}`;

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
