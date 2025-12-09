/**
 * Hito 12: Enrichment Types
 * Tipos para enrichments de mensajes
 */

export type EnrichmentType = 
  | 'sentiment'
  | 'intent'
  | 'entities'
  | 'language'
  | 'summary'
  | 'keywords'
  | 'category';

export interface Enrichment {
  id: string;
  messageId: string;
  type: EnrichmentType;
  value: any;
  confidence?: number;
  provider?: string;
  createdAt: string;
  processingTimeMs?: number;
}

export interface EnrichmentBatch {
  messageId: string;
  enrichments: Enrichment[];
  timestamp: string;
}

// Sentiment values
export interface SentimentValue {
  score: number; // -1 to 1
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

// Intent values
export interface IntentValue {
  name: string;
  confidence: number;
  slots?: Record<string, string>;
}

// Entity values
export interface EntityValue {
  text: string;
  type: string; // 'person', 'organization', 'location', 'date', etc.
  start: number;
  end: number;
  confidence: number;
}

// Language values
export interface LanguageValue {
  code: string; // 'es', 'en', etc.
  name: string;
  confidence: number;
}

// Summary values
export interface SummaryValue {
  text: string;
  originalLength: number;
  summaryLength: number;
}

// Keywords values
export interface KeywordsValue {
  keywords: Array<{
    text: string;
    score: number;
  }>;
}

// Category values
export interface CategoryValue {
  category: string;
  subcategory?: string;
  confidence: number;
}

// Type guards
export function isSentimentEnrichment(e: Enrichment): e is Enrichment & { value: SentimentValue } {
  return e.type === 'sentiment';
}

export function isIntentEnrichment(e: Enrichment): e is Enrichment & { value: IntentValue } {
  return e.type === 'intent';
}

export function isEntitiesEnrichment(e: Enrichment): e is Enrichment & { value: EntityValue[] } {
  return e.type === 'entities';
}
