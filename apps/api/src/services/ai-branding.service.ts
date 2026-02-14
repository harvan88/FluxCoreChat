/**
 * AI Branding Service
 * Extracted from ai.service.ts — handles FluxCore promo markers and branding footers.
 * Pure functions with no side effects.
 */

const FLUXCORE_PROMO_MARKER = '[[fluxcore:promo]]';
const FLUXCORE_BRANDING_FOOTER = '(gestionado por FluxCore)';

export function stripFluxCorePromoMarker(text: string): { text: string; promo: boolean } {
  if (typeof text !== 'string' || text.length === 0) {
    return { text: text || '', promo: false };
  }

  const markerIdx = text.indexOf(FLUXCORE_PROMO_MARKER);
  if (markerIdx === -1) {
    return { text, promo: false };
  }

  const withoutMarker = text.split(FLUXCORE_PROMO_MARKER).join('');
  const cleaned = withoutMarker
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { text: cleaned, promo: true };
}

export function stripFluxCoreBrandingFooterFromEnd(text: string): string {
  if (typeof text !== 'string' || text.length === 0) return text || '';

  const lines = text.split('\n');
  let end = lines.length - 1;

  while (end >= 0 && lines[end].trim().length === 0) {
    end -= 1;
  }

  if (end < 0) return '';

  const lastLine = lines[end].trim();

  if (
    lastLine === FLUXCORE_BRANDING_FOOTER ||
    lastLine.toLowerCase().includes('gestionado por fluxcore')
  ) {
    const trimmedLines = lines.slice(0, end);
    let end2 = trimmedLines.length - 1;
    while (end2 >= 0 && trimmedLines[end2].trim().length === 0) {
      end2 -= 1;
    }
    return trimmedLines.slice(0, end2 + 1).join('\n');
  }

  return text;
}

export function appendFluxCoreBrandingFooter(text: string): string {
  const safeText = typeof text === 'string' ? text : '';

  const withoutFooter = stripFluxCoreBrandingFooterFromEnd(safeText);
  const trimmed = withoutFooter.trim();
  if (trimmed.length === 0) {
    return FLUXCORE_BRANDING_FOOTER;
  }

  return `${trimmed}\n\n${FLUXCORE_BRANDING_FOOTER}`;
}

export function getSuggestionBrandingDecision(
  suggestionContent?: string | null
): { promo: boolean } {
  if (!suggestionContent) return { promo: false };
  return { promo: stripFluxCorePromoMarker(suggestionContent).promo };
}
