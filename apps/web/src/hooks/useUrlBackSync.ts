import { useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { usePanelStore } from '../store/panelStore';
import { useUIStore } from '../store/uiStore';
import { ROUTE_REGISTRY } from '../config/route-registry';

/**
 * useUrlBackSync — Estado → URL
 * Cuando el tab enfocado cambia, actualiza la URL.
 */
export function useUrlBackSync() {
  const navigate = useNavigate();
  const location = useLocation();
  const { alias } = useParams<{ alias: string }>();
  const { layout } = usePanelStore();
  const activeActivity = useUIStore(state => state.activeActivity);

  const lastPushed = useRef('');

  useEffect(() => {
    if (!alias) return;

    const focusedContainer = layout.containers.find(c => c.id === layout.focusedContainerId) || layout.containers[0];
    const activeTab = focusedContainer?.tabs.find(t => t.id === focusedContainer.activeTabId);
    if (!activeTab?.identity) {
      // Último tab cerrado → empujar URL base de la actividad
      const baseRoute = ROUTE_REGISTRY.find(r => r.activity === activeActivity && !r.pattern.includes(':'));
      if (baseRoute) {
        const basePath = `/@/${alias}${baseRoute.pattern}`;
        if (basePath !== location.pathname && basePath !== lastPushed.current) {
          lastPushed.current = basePath;
          navigate(basePath, { replace: true });
        }
      }
      return;
    }

    let targetPath = `/@/${alias}`;

    // Buscar ruta por identityPrefix
    // Ej: identity = "extension:@fluxcore/asistentes:assistant:accountId:resourceId"
    // identityPrefix = "extension:@fluxcore/asistentes:assistant"
    const route = ROUTE_REGISTRY.find(r => 
      r.identityPrefix && activeTab.identity!.startsWith(r.identityPrefix + ':') && r.pattern.includes(':id')
    );

    if (route) {
      if (route.supportsMulti) {
        const allIds = (focusedContainer?.tabs || [])
          .filter(t => t.type === activeTab.type)
          .map(t => {
            const prefixLen = route.identityPrefix!.length + 1;
            // Para extensiones, el formato incluye el accountId antes del resourceId
            // Ej: "extension:@fluxcore/asistentes:assistant:accountId:resourceId"
            const rest = t.identity!.substring(prefixLen);
            const parts = rest.split(':');
            return parts.length > 1 ? parts[1] : parts[0]; 
          });
        targetPath = `/@/${alias}${route.pattern.replace(':id', allIds.join('+'))}`;
      } else {
        const prefixLen = route.identityPrefix!.length + 1;
        const rest = activeTab.identity.substring(prefixLen);
        const parts = rest.split(':');
        // Para extensiones (ext:id:view:account:resourceId), rest es "accountId:resourceId"
        const id = parts.length > 1 ? parts[1] : parts[0];
        targetPath = `/@/${alias}${route.pattern.replace(':id', id)}`;
      }
    } else if (activeTab.identity.startsWith('extension:')) {
      // Fallback para vistas base de extensiones (ej: "extension:@fluxcore/asistentes:usage:accountId")
      const parts = activeTab.identity.split(':');
      const view = parts[2];
      const extRoute = ROUTE_REGISTRY.find(r => r.activity === activeActivity && r.subView === view);
      if (extRoute) {
        targetPath = `/@/${alias}${extRoute.pattern}`;
      }
    }

    // Solo navegar si cambió
    if (targetPath !== location.pathname && targetPath !== lastPushed.current) {
      lastPushed.current = targetPath;
      navigate(targetPath, { replace: true });
    }
  }, [layout.focusedContainerId, layout.containers, activeActivity, alias]);
}
