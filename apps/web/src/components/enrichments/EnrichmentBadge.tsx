/**
 * FC-309: EnrichmentBadge Component
 * Muestra enrichments de un mensaje de forma visual
 */

import { 
  SmilePlus, 
  Frown, 
  Meh, 
  Target, 
  Tag, 
  Globe, 
  FileText, 
  Key,
  FolderTree,
  Loader2,
} from 'lucide-react';
import type { 
  Enrichment, 
  SentimentValue,
  IntentValue,
  LanguageValue,
  CategoryValue,
} from '../../types/enrichments';
import { useMessageEnrichments, useIsEnrichmentLoading } from '../../store/enrichmentStore';
import { Badge } from '../ui';

interface EnrichmentBadgeProps {
  messageId: string;
  showAll?: boolean;
  size?: 'sm' | 'md';
}

export function EnrichmentBadge({ 
  messageId, 
  showAll = false,
  size = 'sm',
}: EnrichmentBadgeProps) {
  const enrichments = useMessageEnrichments(messageId);
  const isLoading = useIsEnrichmentLoading(messageId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-muted">
        <Loader2 size={12} className="animate-spin" />
        <span className="text-xs">Analizando...</span>
      </div>
    );
  }

  if (enrichments.length === 0) {
    return null;
  }

  // Si showAll, mostrar todos; sino solo los principales
  const displayEnrichments = showAll 
    ? enrichments 
    : enrichments.filter(e => ['sentiment', 'intent', 'category'].includes(e.type)).slice(0, 3);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {displayEnrichments.map((enrichment) => (
        <SingleEnrichmentBadge 
          key={enrichment.id} 
          enrichment={enrichment}
          size={size}
        />
      ))}
      {!showAll && enrichments.length > displayEnrichments.length && (
        <span className="text-xs text-muted">
          +{enrichments.length - displayEnrichments.length}
        </span>
      )}
    </div>
  );
}

interface SingleEnrichmentBadgeProps {
  enrichment: Enrichment;
  size?: 'sm' | 'md';
}

function SingleEnrichmentBadge({ enrichment, size = 'sm' }: SingleEnrichmentBadgeProps) {
  const { icon, label, variant } = getEnrichmentDisplay(enrichment);

  return (
    <Badge
      variant={variant}
      size={size}
      badgeStyle="soft"
      leftIcon={icon}
    >
      {label}
    </Badge>
  );
}

function getEnrichmentDisplay(enrichment: Enrichment): {
  icon: React.ReactNode;
  label: string;
  variant: 'info' | 'success' | 'warning' | 'error' | 'neutral';
} {
  const iconSize = 12;

  switch (enrichment.type) {
    case 'sentiment': {
      const value = enrichment.value as SentimentValue;
      if (value.label === 'positive') {
        return {
          icon: <SmilePlus size={iconSize} />,
          label: 'Positivo',
          variant: 'success',
        };
      } else if (value.label === 'negative') {
        return {
          icon: <Frown size={iconSize} />,
          label: 'Negativo',
          variant: 'error',
        };
      } else {
        return {
          icon: <Meh size={iconSize} />,
          label: 'Neutral',
          variant: 'neutral',
        };
      }
    }

    case 'intent': {
      const value = enrichment.value as IntentValue;
      return {
        icon: <Target size={iconSize} />,
        label: value.name,
        variant: 'info',
      };
    }

    case 'entities': {
      const entities = enrichment.value as Array<{ type: string }>;
      return {
        icon: <Tag size={iconSize} />,
        label: `${entities.length} entidades`,
        variant: 'neutral',
      };
    }

    case 'language': {
      const value = enrichment.value as LanguageValue;
      return {
        icon: <Globe size={iconSize} />,
        label: value.code.toUpperCase(),
        variant: 'neutral',
      };
    }

    case 'summary': {
      return {
        icon: <FileText size={iconSize} />,
        label: 'Resumen',
        variant: 'info',
      };
    }

    case 'keywords': {
      const keywords = enrichment.value?.keywords || [];
      return {
        icon: <Key size={iconSize} />,
        label: `${keywords.length} keywords`,
        variant: 'neutral',
      };
    }

    case 'category': {
      const value = enrichment.value as CategoryValue;
      return {
        icon: <FolderTree size={iconSize} />,
        label: value.category,
        variant: 'info',
      };
    }

    default:
      return {
        icon: null,
        label: enrichment.type,
        variant: 'neutral',
      };
  }
}

// Panel expandido para ver todos los enrichments
interface EnrichmentPanelProps {
  messageId: string;
}

export function EnrichmentPanel({ messageId }: EnrichmentPanelProps) {
  const enrichments = useMessageEnrichments(messageId);

  if (enrichments.length === 0) {
    return (
      <div className="p-4 text-center text-muted text-sm">
        No hay enrichments disponibles
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 bg-surface rounded-lg border border-subtle">
      <h4 className="text-sm font-semibold text-primary">Análisis del mensaje</h4>
      <div className="space-y-2">
        {enrichments.map((enrichment) => (
          <EnrichmentDetail key={enrichment.id} enrichment={enrichment} />
        ))}
      </div>
    </div>
  );
}

function EnrichmentDetail({ enrichment }: { enrichment: Enrichment }) {
  return (
    <div className="flex items-start gap-3 p-2 bg-elevated rounded-lg">
      <SingleEnrichmentBadge enrichment={enrichment} size="md" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted">
          {enrichment.confidence && (
            <span>Confianza: {Math.round(enrichment.confidence * 100)}%</span>
          )}
          {enrichment.processingTimeMs && (
            <span className="ml-2">· {enrichment.processingTimeMs}ms</span>
          )}
        </div>
        {enrichment.type === 'summary' && (
          <p className="text-sm text-secondary mt-1">
            {(enrichment.value as { text: string }).text}
          </p>
        )}
        {enrichment.type === 'entities' && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(enrichment.value as Array<{ text: string; type: string }>).map((entity, i) => (
              <span 
                key={i} 
                className="text-xs px-1.5 py-0.5 bg-hover rounded text-secondary"
              >
                {entity.text} ({entity.type})
              </span>
            ))}
          </div>
        )}
        {enrichment.type === 'keywords' && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(enrichment.value?.keywords || []).map((kw: { text: string }, i: number) => (
              <span 
                key={i} 
                className="text-xs px-1.5 py-0.5 bg-accent/10 text-accent rounded"
              >
                {kw.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
