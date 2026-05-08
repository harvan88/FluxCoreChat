// No necesitamos dotenv si usamos bun --env-file
const googleKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

async function testGeocoding() {
  console.log('🧪 Iniciando prueba de Geocoding con Google...');
  console.log(`🔑 Clave detectada: ${googleKey ? 'SÍ' : 'NO'}`);

  if (!googleKey) {
    console.log('❌ Error: VITE_GOOGLE_MAPS_API_KEY no encontrada en las variables de entorno.');
    return;
  }

  const address = 'Av. Corrientes 1234, C1043 Cdad. Autónoma de Buenos Aires, Argentina';
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleKey}`;

  try {
    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status === 'OK') {
      const result = data.results[0];
      console.log('✅ ¡PRUEBA EXITOSA!');
      console.log('📍 Dirección formateada:', result.formatted_address);
      console.log('🌐 Coordenadas:', result.geometry.location);
    } else {
      console.log('❌ Error de Google:', data.status);
      if (data.error_message) console.log('📝 Detalle:', data.error_message);
    }
  } catch (error) {
    console.error('💥 Error de conexión:', error);
  }
}

testGeocoding();
