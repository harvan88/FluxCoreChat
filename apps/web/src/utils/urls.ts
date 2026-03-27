export const getApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) return envUrl;
    
    if (typeof window !== 'undefined') {
        const { hostname } = window.location;
        // Si estamos en una IP local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        const isLocalIp = /^192\.168\./.test(hostname) || 
                          /^10\./.test(hostname) || 
                          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
        
        if (isLocalIp) {
            // Prioridad a la IP conocida del usuario
            if (hostname === '192.168.0.179' || hostname === 'localhost') {
                return `http://192.168.0.179:3000`;
            }
            return `http://${hostname}:3000`;
        }
    }
    
    return 'http://localhost:3000';
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
            return `ws://${hostname}:3000/ws`;
        }
    }
    
    return 'ws://localhost:3000/ws';
};

export const fixLocalhostUrl = (url: string | null | undefined): string | null | undefined => {
    if (!url || typeof window === 'undefined') return url;
    
    const { hostname } = window.location;
    
    // Si estamos en una red local y la URL apunta a localhost, sustituimos
    const isLocalIp = /^192\.168\./.test(hostname) || 
                      /^10\./.test(hostname) || 
                      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

    if ((isLocalIp || hostname === 'localhost') && url.includes('localhost:3000')) {
        // Usamos la IP actual desde window.location para que coincida con el servidor API
        return url.replace('localhost:3000', `${hostname}:3000`);
    }
    
    return url;
};
