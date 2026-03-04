// SOLUCIÓN PARA EL HARDCODEO DE CHANNEL

// 1. Mapeo explícito de drivers a canales
const DRIVER_TO_CHANNEL_MAP: Record<string, 'web' | 'whatsapp' | 'telegram' | 'email' | 'api' | 'unknown'> = {
  'chatcore/internal': 'web',
  'chatcore/webchat': 'web',
  'chatcore/whatsapp': 'whatsapp',
  'chatcore/telegram': 'telegram',
  'chatcore/email': 'email',
  'chatcore/api': 'api',
  'whatsapp/adapter': 'whatsapp',
  'telegram/adapter': 'telegram',
  'email/adapter': 'email',
  'api/adapter': 'api',
};

// 2. Función mejorada para resolver canal
function resolveChannelFromDriverId(driverId: string): 'web' | 'whatsapp' | 'telegram' | 'email' | 'api' | 'unknown' {
  // Buscar mapeo exacto primero
  if (DRIVER_TO_CHANNEL_MAP[driverId]) {
    return DRIVER_TO_CHANNEL_MAP[driverId];
  }
  
  // Búsqueda por substring (fallback)
  if (driverId.includes('whatsapp')) return 'whatsapp';
  if (driverId.includes('telegram')) return 'telegram';
  if (driverId.includes('email')) return 'email';
  if (driverId.includes('api')) return 'api';
  if (driverId.includes('webchat') || driverId.includes('internal')) return 'web';
  
  // Si no se reconoce, marcar como unknown en lugar de web
  return 'unknown';
}

// 3. Uso en ChatProjector
const driverId = signal.provenanceDriverId || '';
const channel = resolveChannelFromDriverId(driverId);

// 4. Validación adicional
if (channel === 'unknown') {
  console.warn(`[ChatProjector] ⚠️ Unknown driverId: ${driverId} - marking as unknown channel`);
  // Opcional: crear alerta para monitoreo
  await alertingService.notify({
    type: 'unknown_driver',
    driverId,
    signalId: signal.sequenceNumber,
    timestamp: new Date()
  });
}
