export type ConversationChannel = 'web' | 'whatsapp' | 'telegram';
export type ConversationStatus = 'active' | 'archived' | 'closed';

export interface Conversation {
  id: string;
  relationshipId: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  lastMessageAt: Date | null;
  lastMessageText: string | null;
  unreadCountA: number;
  unreadCountB: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConversationInput {
  relationshipId: string;
  channel: ConversationChannel;
}

export interface UpdateConversationInput {
  status?: ConversationStatus;
}
