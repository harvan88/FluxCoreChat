/**
 * 🌍 CHATCORE WORLD DEFINER
 * 
 * Componente centralizado y robusto para que ChatCore defina el mundo
 * Reemplaza la lógica dispersa y hardcodeos del kernel
 * 
 * RESPONSABILIDADES:
 * - Definir canales de comunicación
 * - Mapear orígenes a contextos
 * - Centralizar decisiones de routing
 * - Proveer autoridad única
 */

export interface WorldContext {
    channel: 'web' | 'whatsapp' | 'telegram' | 'email' | 'api' | 'internal' | 'test' | 'unknown';
    source: 'human' | 'system' | 'adapter' | 'automated';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    routing: {
        requiresAi: boolean;
        skipProcessing: boolean;
        customHandler?: string;
    };
    metadata: {
        origin: string;
        driverId: string;
        entryPoint: string;
        [key: string]: any;
    };
}

export interface RequestContext {
    headers?: Record<string, string>;
    meta?: Record<string, any>;
    userAgent?: string;
    origin?: string;
    requestId?: string;
    accountId?: string;
    userId?: string;
}

/**
 * 🔑 CHATCORE WORLD DEFINER
 * 
 * Autoridad centralizada para definir el mundo de ChatCore
 */
export class ChatCoreWorldDefiner {
    
    /**
     * 🌍 DEFINIR EL MUNDO DESDE EL CONTEXTO
     * 
     * Método principal y centralizado para definir cómo ChatCore ve el mundo
     */
    static defineWorld(context: RequestContext): WorldContext {
        // 1. Detectar canal (autoridad centralizada)
        const channel = this.resolveChannel(context);
        
        // 2. Detectar origen
        const source = this.resolveSource(context);
        
        // 3. Determinar prioridad
        const priority = this.resolvePriority(context);
        
        // 4. Definir routing
        const routing = this.resolveRouting(channel, source, context);
        
        // 5. Construir metadata
        const metadata = this.buildMetadata(context, channel, source);
        
        return {
            channel,
            source,
            priority,
            routing,
            metadata
        };
    }
    
    /**
     * 🔍 RESOLVER CANAL (LÓGICA CENTRALIZADA)
     */
    private static resolveChannel(context: RequestContext): WorldContext['channel'] {
        const { headers = {}, meta = {}, userAgent, origin } = context;
        
        // 1. Canal explícito (máxima prioridad)
        if (meta.channel) {
            return this.validateChannel(meta.channel);
        }
        
        // 2. Headers específicos
        if (headers['x-channel']) {
            return this.validateChannel(headers['x-channel']);
        }
        
        // 3. User-Agent analysis
        if (userAgent) {
            const uaChannel = this.detectChannelFromUserAgent(userAgent);
            if (uaChannel !== 'unknown') return uaChannel;
        }
        
        // 4. Origin analysis
        if (origin) {
            const originChannel = this.detectChannelFromOrigin(origin);
            if (originChannel !== 'unknown') return originChannel;
        }
        
        // 5. Meta analysis
        if (meta.driverId) {
            const driverChannel = this.detectChannelFromDriverId(meta.driverId);
            if (driverChannel !== 'unknown') return driverChannel;
        }
        
        // 6. Default para requests HTTP
        if (context.requestId || meta.ip) {
            return 'web';
        }
        
        // 7. Unknown si no se puede determinar
        return 'unknown';
    }
    
    /**
     * 🔍 RESOLVER ORIGEN
     */
    private static resolveSource(context: RequestContext): WorldContext['source'] {
        const { meta = {}, userId, accountId } = context;
        
        // 1. Sistema si es interno
        if (meta.driverId?.includes('internal') || meta.systemGenerated) {
            return 'system';
        }
        
        // 2. Adapter si viene de adaptador
        if (meta.driverId?.includes('adapter') || meta.fromAdapter) {
            return 'adapter';
        }
        
        // 3. Automated si es proceso automático
        if (meta.automated || meta.scheduled) {
            return 'automated';
        }
        
        // 4. Human si hay usuario autenticado
        if (userId || accountId) {
            return 'human';
        }
        
        // 5. Default a human
        return 'human';
    }
    
    /**
     * 🔍 RESOLVER PRIORIDAD
     */
    private static resolvePriority(context: RequestContext): WorldContext['priority'] {
        const { meta = {} } = context;
        
        // 1. Prioridad explícita
        if (meta.priority) {
            return this.validatePriority(meta.priority);
        }
        
        // 2. Urgent para casos críticos
        if (meta.urgent || meta.emergency) {
            return 'urgent';
        }
        
        // 3. High para high-value
        if (meta.highPriority || meta.premium) {
            return 'high';
        }
        
        // 4. Low para background
        if (meta.background || meta.lowPriority) {
            return 'low';
        }
        
        // 5. Default normal
        return 'normal';
    }
    
    /**
     * 🔍 RESOLVER ROUTING
     */
    private static resolveRouting(
        channel: WorldContext['channel'], 
        source: WorldContext['source'], 
        context: RequestContext
    ): WorldContext['routing'] {
        const { meta = {} } = context;
        
        // 1. Canales que no requieren AI
        const noAiChannels = ['test', 'internal'];
        const requiresAi = !noAiChannels.includes(channel) && meta.requiresAi !== false;
        
        // 2. Casos que deben saltarse
        const skipProcessing = meta.skipProcessing || channel === 'test';
        
        // 3. Custom handler si se especifica
        const customHandler = meta.customHandler;
        
        return {
            requiresAi,
            skipProcessing,
            customHandler
        };
    }
    
    /**
     * 🔍 CONSTRUIR METADATA
     */
    private static buildMetadata(
        context: RequestContext, 
        channel: WorldContext['channel'], 
        source: WorldContext['source']
    ): WorldContext['metadata'] {
        return {
            origin: context.origin || 'unknown',
            driverId: context.meta?.driverId || 'chatcore/unknown',
            entryPoint: context.meta?.entryPoint || 'api/unknown',
            requestId: context.requestId,
            timestamp: new Date().toISOString(),
            channel,
            source,
            ...context.meta
        };
    }
    
    // === MÉTODOS DE DETECCIÓN ===
    
    private static detectChannelFromUserAgent(userAgent: string): WorldContext['channel'] {
        const ua = userAgent.toLowerCase();
        
        if (ua.includes('whatsapp')) return 'whatsapp';
        if (ua.includes('telegram')) return 'telegram';
        if (ua.includes('email') || ua.includes('mail')) return 'email';
        if (ua.includes('api') || ua.includes('curl') || ua.includes('postman')) return 'api';
        
        return 'unknown';
    }
    
    private static detectChannelFromOrigin(origin: string): WorldContext['channel'] {
        const org = origin.toLowerCase();
        
        if (org.includes('webchat') || org.includes('widget')) return 'web';
        if (org.includes('whatsapp')) return 'whatsapp';
        if (org.includes('telegram')) return 'telegram';
        
        return 'unknown';
    }
    
    private static detectChannelFromDriverId(driverId: string): WorldContext['channel'] {
        const driver = driverId.toLowerCase();
        
        if (driver.includes('whatsapp')) return 'whatsapp';
        if (driver.includes('telegram')) return 'telegram';
        if (driver.includes('email')) return 'email';
        if (driver.includes('api')) return 'api';
        if (driver.includes('internal') || driver.includes('webchat')) return 'web';
        
        return 'unknown';
    }
    
    // === MÉTODOS DE VALIDACIÓN ===
    
    private static validateChannel(channel: string): WorldContext['channel'] {
        const validChannels = ['web', 'whatsapp', 'telegram', 'email', 'api', 'internal', 'test', 'unknown'];
        return validChannels.includes(channel) ? channel as WorldContext['channel'] : 'unknown';
    }
    
    private static validatePriority(priority: string): WorldContext['priority'] {
        const validPriorities = ['low', 'normal', 'high', 'urgent'];
        return validPriorities.includes(priority) ? priority as WorldContext['priority'] : 'normal';
    }
    
    // === MÉTODOS DE UTILIDAD ===
    
    /**
     * 📊 OBTENER ESTADÍSTICAS DE DEFINICIÓN DE MUNDO
     */
    static getWorldDefinitionStats(): any {
        return {
            supportedChannels: ['web', 'whatsapp', 'telegram', 'email', 'api', 'internal', 'test', 'unknown'],
            supportedSources: ['human', 'system', 'adapter', 'automated'],
            supportedPriorities: ['low', 'normal', 'high', 'urgent'],
            version: '1.0.0',
            lastUpdated: new Date().toISOString()
        };
    }
    
    /**
     * 🔍 VALIDAR CONTEXTO COMPLETO
     */
    static validateWorldContext(context: WorldContext): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (!context.channel) errors.push('Channel is required');
        if (!context.source) errors.push('Source is required');
        if (!context.priority) errors.push('Priority is required');
        if (!context.routing) errors.push('Routing is required');
        if (!context.metadata) errors.push('Metadata is required');
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}
