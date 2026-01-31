/**
 * Core Components - Componentes UI base reutilizables
 * 
 * PRINCIPIO: Componentes puramente visuales, sin semántica del sistema.
 * La vista que los usa decide qué contenido mostrar.
 */

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { LoadingState } from './LoadingState';
export type { LoadingStateProps } from './LoadingState';

export { ErrorState } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';

export { ViewContainer } from './ViewContainer';
export type { ViewContainerProps } from './ViewContainer';
