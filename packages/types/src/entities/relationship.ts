export type RelationshipStatus = 'active' | 'blocked' | 'archived';
export type ContextEntryType = 'note' | 'preference' | 'rule';

export interface ContextEntry {
  authorAccountId: string;
  content: string;
  type: ContextEntryType;
  createdAt: string;
}

export interface RelationshipContext {
  entries: ContextEntry[];
  totalChars: number;
}

export interface RelationshipPerspective {
  savedName: string | null;
  tags: string[];
  status: RelationshipStatus;
}

export interface Relationship {
  id: string;
  accountAId: string;
  accountBId: string;
  perspectiveA: RelationshipPerspective;
  perspectiveB: RelationshipPerspective;
  context: RelationshipContext;
  createdAt: Date;
  lastInteraction: Date | null;
}

export interface CreateRelationshipInput {
  accountAId: string;
  accountBId: string;
}

export interface UpdateRelationshipPerspectiveInput {
  savedName?: string | null;
  tags?: string[];
  status?: RelationshipStatus;
}

export interface AddContextEntryInput {
  authorAccountId: string;
  content: string;
  type: ContextEntryType;
}
