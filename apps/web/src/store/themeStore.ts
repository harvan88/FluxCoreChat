/**
 * Theme Store - Gestión del tema de la interfaz (claro/oscuro)
 * 
 * Soporta:
 * - Tema claro (light)
 * - Tema oscuro (dark)
 * - Preferencia del sistema (system)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeStore {
  // State
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  
  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Detecta la preferencia del sistema operativo
 */
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Resuelve el tema actual basado en la preferencia
 */
const resolveTheme = (theme: Theme): ResolvedTheme => {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

/**
 * Aplica el tema al documento HTML
 */
const applyTheme = (resolvedTheme: ResolvedTheme) => {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  root.setAttribute('data-theme', resolvedTheme);
  
  // También actualizar la clase para compatibilidad con Tailwind dark mode
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark', // Default: tema oscuro
      resolvedTheme: 'dark',
      
      setTheme: (theme) => {
        const resolvedTheme = resolveTheme(theme);
        applyTheme(resolvedTheme);
        set({ theme, resolvedTheme });
      },
      
      toggleTheme: () => {
        const { theme } = get();
        const newTheme: Theme = theme === 'dark' ? 'light' : 'dark';
        const resolvedTheme = resolveTheme(newTheme);
        applyTheme(resolvedTheme);
        set({ theme: newTheme, resolvedTheme });
      },
    }),
    {
      name: 'fluxcore-theme',
      onRehydrateStorage: () => (state) => {
        // Aplicar tema al cargar la app
        if (state) {
          const resolvedTheme = resolveTheme(state.theme);
          applyTheme(resolvedTheme);
          // Actualizar resolvedTheme por si la preferencia del sistema cambió
          if (state.theme === 'system') {
            state.resolvedTheme = resolvedTheme;
          }
        }
      },
    }
  )
);

// ============================================================================
// Listener para cambios en preferencia del sistema
// ============================================================================

if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  mediaQuery.addEventListener('change', (e) => {
    const state = useThemeStore.getState();
    if (state.theme === 'system') {
      const newResolvedTheme: ResolvedTheme = e.matches ? 'dark' : 'light';
      applyTheme(newResolvedTheme);
      useThemeStore.setState({ resolvedTheme: newResolvedTheme });
    }
  });
}

// ============================================================================
// Hook helper
// ============================================================================

export const useTheme = () => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useThemeStore();
  return { theme, resolvedTheme, setTheme, toggleTheme };
};
