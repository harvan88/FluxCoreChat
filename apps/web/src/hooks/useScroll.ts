import { useState, useEffect } from 'react';

interface UseScrollOptions {
  offset?: number;
  minHeight?: number;
  maxHeightMobile?: number;
}

interface UseScrollReturn {
  maxHeight: string;
  isMobile: boolean;
}

/**
 * Hook para gestionar scroll dinámico con max-height responsive
 * 
 * @param options - Configuración del scroll
 * @param options.offset - Offset en píxeles a restar del viewport (default: 56px = spacing.14)
 * @param options.minHeight - Altura mínima en píxeles (default: 200)
 * @param options.maxHeightMobile - Altura máxima en móvil en píxeles (default: 600)
 * 
 * @returns maxHeight - String CSS para max-height
 * @returns isMobile - Boolean indicando si está en vista móvil
 * 
 * @example
 * ```tsx
 * const { maxHeight } = useScroll({ offset: 64 });
 * <div style={{ maxHeight }} className="overflow-y-auto">
 *   {content}
 * </div>
 * ```
 */
export function useScroll(options: UseScrollOptions = {}): UseScrollReturn {
  const {
    offset = 56, // 3.5rem = spacing.14 (default header height)
    minHeight = 200,
    maxHeightMobile = 600,
  } = options;

  const [maxHeight, setMaxHeight] = useState('100vh');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateHeight = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const mobile = viewportWidth < 768;

      setIsMobile(mobile);

      let calculatedHeight: number;

      if (mobile) {
        // En móvil: limitar a maxHeightMobile o viewport - offset, lo que sea menor
        calculatedHeight = Math.min(maxHeightMobile, viewportHeight - offset);
      } else {
        // En desktop: viewport - offset
        calculatedHeight = viewportHeight - offset;
      }

      // Aplicar altura mínima
      calculatedHeight = Math.max(calculatedHeight, minHeight);

      setMaxHeight(`${calculatedHeight}px`);
    };

    // Ejecutar al montar
    updateHeight();

    // Escuchar cambios de tamaño
    window.addEventListener('resize', updateHeight);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateHeight);
  }, [offset, minHeight, maxHeightMobile]);

  return { maxHeight, isMobile };
}
