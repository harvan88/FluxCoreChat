/**
 * FC-600: Lazy Loading Components
 * Code splitting para reducir bundle inicial
 */

import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <Loader2 className="animate-spin text-muted" size={32} />
    </div>
  );
}

// Helper para crear lazy components con fallback
export function lazyWithFallback<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: ReactNode = <LoadingFallback />
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// ============================================================================
// Lazy Components - No críticos para carga inicial
// ============================================================================

// Settings Panel - carga cuando usuario abre settings
export const LazySettingsPanel = lazyWithFallback(
  () => import('./settings/SettingsPanel').then(m => ({ default: m.SettingsPanel }))
);

// Extensions Panel - carga cuando usuario abre extensions
export const LazyExtensionsPanel = lazyWithFallback(
  () => import('./extensions/ExtensionsPanel').then(m => ({ default: m.ExtensionsPanel }))
);

// Component Showcase - solo para desarrollo
export const LazyComponentShowcase = lazyWithFallback(
  () => import('./examples/ComponentShowcase').then(m => ({ default: m.ComponentShowcase }))
);

// Enrichment components - cargan con mensajes
export const LazyEnrichmentBadge = lazyWithFallback(
  () => import('./enrichments/EnrichmentBadge').then(m => ({ default: m.EnrichmentBadge }))
);

export const LazyEnrichmentPanel = lazyWithFallback(
  () => import('./enrichments/EnrichmentBadge').then(m => ({ default: m.EnrichmentPanel }))
);
