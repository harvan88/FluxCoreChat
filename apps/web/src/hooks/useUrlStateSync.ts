import { useEffect, useRef } from 'react';
import { useLocation, useParams, matchPath } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { usePanelStore } from '../store/panelStore';
import { ROUTE_REGISTRY, buildTabContext, resolveTabTitle, resolveTabIcon } from '../config/route-registry';
import type { ActivityType } from '../types';

/**
 * useUrlStateSync — URL → Estado
 * Lee la URL y abre el tab correspondiente. Nada más.
 */
export function useUrlStateSync() {
  const location = useLocation();
  const { alias } = useParams<{ alias: string }>();
  const selectedAccountId = useUIStore(state => state.selectedAccountId);
  const lastProcessed = useRef('');

  useEffect(() => {
    if (!alias || !selectedAccountId) return;

    // No reprocesar la misma URL
    const urlKey = location.pathname;
    if (urlKey === lastProcessed.current) return;
    lastProcessed.current = urlKey;

    const uiStore = useUIStore.getState();
    const panelStore = usePanelStore.getState();

    // Limpiar sub-path: /@/alias/mensajes/uuid → /mensajes/uuid
    const prefix = `/@/${alias}`;
    let subPath = location.pathname;
    if (subPath.startsWith(prefix)) subPath = subPath.slice(prefix.length);
    if (subPath === '') subPath = '/';

    // Buscar ruta en el registro
    for (const route of ROUTE_REGISTRY) {
      const match = matchPath({ path: route.pattern, end: true }, subPath);
      if (!match) continue;

      // Sincronizar actividad
      if (uiStore.activeActivity !== route.activity) {
        uiStore.setActiveActivity(route.activity as ActivityType);
        uiStore.setSidebarOpen(true);
      }

      // Abrir tab si la ruta tiene metadata completa
      const rawId = match.params?.id;
      if (route.container && route.tabType && route.identityPrefix) {
        const id = rawId || selectedAccountId;
        const ids = route.supportsMulti ? id.split('+') : [id];

        ids.forEach(resourceId => {
          // Extraer extensionId de la actividad si aplica (formato ext:id)
          const extensionId = route.activity.startsWith('ext:') ? route.activity.replace('ext:', '') : null;

          // Construir identidad: extensiones incluyen el accountId para evitar colisiones
          const identity = extensionId 
            ? `${route.identityPrefix}:${selectedAccountId}:${resourceId}`
            : `${route.identityPrefix}:${resourceId}`;

          const context = buildTabContext(route.contextBuilder, resourceId, selectedAccountId);
          
          // Asegurar que las extensiones tengan su ID y vista en el contexto
          if (extensionId) {
            context.extensionId = extensionId;
            // Si la ruta define un subView pero buildTabContext no lo puso, lo ponemos aquí como fallback
            if (!context.view && route.subView) context.view = route.subView;
          }

          panelStore.openTab(route.container as any, {
            identity,
            type: route.tabType as any,
            title: resolveTabTitle(route, resourceId, uiStore.conversations),
            icon: resolveTabIcon(route, resourceId),
            level: route.navLevel,
            closable: true,
            context,
          });
        });

        if (route.contextBuilder === 'chat') {
          const lastId = ids[ids.length - 1];
          uiStore.setSelectedConversation(lastId);
        }
      }

      // Extensiones con subView
      if (route.tabType === 'extension' && route.subView) {
        const extensionId = route.activity.replace('ext:', '');
        panelStore.openTab('extensions' as any, {
          type: 'extension' as any,
          identity: `extension:${extensionId}:${route.subView}:${selectedAccountId}`,
          title: route.defaultTitle || route.subView,
          icon: resolveTabIcon(route, route.subView),
          level: route.navLevel,
          closable: true,
          context: { extensionId, view: route.subView, accountId: selectedAccountId },
        });
      }

      break; // Primera coincidencia gana
    }
  }, [location.pathname, alias, selectedAccountId]);
}
