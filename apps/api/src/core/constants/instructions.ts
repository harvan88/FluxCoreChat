
/**
 * 🧠 System-Level AI Instructions (Single Source of Truth)
 * 
 * Canon §5.2: Todas las instrucciones que definen el comportamiento de las capacidades 
 * de sistema deben residir en este archivo para garantizar coherencia semántica.
 */

export const SYSTEM_INSTRUCTIONS = {
    /**
     * Instrucción para la plantilla de horarios y sedes.
     * Define cómo la IA debe interpretar la verdad del mundo temporal.
     */
    SCHEDULE_TEMPLATE: "Esta plantilla habilita el conocimiento sobre sedes físicas y horarios. Úsala para responder: '¿A qué hora cierran?', '¿Tienen sucursales?', '¿Cuál es la dirección?'. Si la interacción pregunta por disponibilidad inmediata ('¿Están abiertos?', '¿Puedo ir ahora?'), menciona la intención: 'is business open'."
} as const;
