export type MessageType = 'incoming' | 'outgoing' | 'system';
export type MessageGeneratedBy = 'human' | 'ai';

export interface MessageMedia {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  filename?: string;
  mimeType?: string;
  size?: number;
}

export interface MessageLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface MessageButton {
  id: string;
  text: string;
  action: string;
}

export interface MessageContent {
  text: string;
  media?: MessageMedia[];
  location?: MessageLocation;
  buttons?: MessageButton[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderAccountId: string;
  content: MessageContent;
  type: MessageType;
  generatedBy: MessageGeneratedBy;
  aiApprovedBy: string | null;
  createdAt: Date;
}

export interface CreateMessageInput {
  conversationId: string;
  senderAccountId: string;
  content: MessageContent;
  type: MessageType;
  generatedBy?: MessageGeneratedBy;
}

export interface MessageEnrichment {
  id: string;
  messageId: string;
  extensionId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}
