import { FluxCoreCapability } from './index';

export const SYSTEM_IS_BUSINESS_OPEN: FluxCoreCapability = {
    id: 'fluxcore.is_business_open',
    slug: 'is_business_open',
    version: '1.0.0',
    domain: 'fluxcore',
    kind: 'query',
    translationStrategy: 'tool',
    name: 'is_business_open',
    description: 'Consulta si el negocio está abierto en este momento o en una fecha/hora específica.',
    jsonSchema: {
        type: 'function',
        function: {
            name: 'is_business_open',
            description: 'Consulta si el negocio o una sucursal específica está abierta. Úsala cuando el usuario pregunte "¿están atendiendo?", "¿a qué hora cierran?" o pregunte por horarios en fechas específicas.',
            parameters: {
                type: 'object',
                properties: {
                    locationId: {
                        type: 'string',
                        description: 'ID de la sucursal (opcional). Si no se especifica, se usará la ubicación principal del negocio.',
                    },
                    at: {
                        type: 'string',
                        description: 'Fecha y hora en formato ISO (opcional) para consultar disponibilidad futura. Si se omite, usa el tiempo real.',
                    }
                },
                additionalProperties: false,
            },
        },
    },
    execute: async () => {
        // La ejecución real se delega al CapabilityExecutionService
        return {};
    }
};
