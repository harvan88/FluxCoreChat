export const getApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) return envUrl;
    
    // FC-705: En desarrollo local, usamos el Proxy de Vite (/api)
    // Esto evita problemas de CORS y conflictos de puerto 3000 directos
    if (typeof window !== 'undefined') {
        const { hostname, port } = window.location;
        
        // Si estamos en localhost y en el puerto de Vite (5173), usamos el proxy
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            if (port === '5173') return '/api';
            return 'http://127.0.0.1:3001';
        }

        // Si estamos en una IP local (para probar desde el móvil, etc.)
        const isLocalIp = /^192\.168\./.test(hostname) || 
                          /^10\./.test(hostname) || 
                          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
        
        if (isLocalIp) {
            // Intentar usar /api si estamos en el puerto de Vite
            if (port === '5173') return '/api';
            return `http://${hostname}:3001`;
        }
    }
    
    return 'http://127.0.0.1:3001';
};

export const getWsUrl = () => {
    const envUrl = import.meta.env.VITE_WS_URL;
    if (envUrl) return envUrl;
    
    if (typeof window !== 'undefined') {
        const { hostname } = window.location;
        const isLocalIp = /^192\.168\./.test(hostname) || 
                          /^10\./.test(hostname) || 
                          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
        
        if (isLocalIp) {
            return `ws://${hostname}:3001/ws`;
        }
    }
    
    return 'ws://127.0.0.1:3001/ws';
};

export const fixLocalhostUrl = (url: string | null | undefined): string | null | undefined => {
    if (!url || typeof window === 'undefined') return url;
    
    const { hostname } = window.location;
    
    // Si estamos en una red local y la URL apunta a localhost, sustituimos
    const isLocalIp = /^192\.168\./.test(hostname) || 
                      /^10\./.test(hostname) || 
                      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

    if ((isLocalIp || hostname === 'localhost') && url.includes('localhost:3001')) {
        // Usamos la IP actual desde window.location para que coincida con el servidor API
        return url.replace('localhost:3001', `${hostname}:3001`);
    }
    
    return url;
};
