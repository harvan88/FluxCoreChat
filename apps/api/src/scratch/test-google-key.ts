const GOOGLE_KEY = 'AIzaSyA0imVC_cZq61Xi1qecW5Ix6qXjg49-Q2o';
const testQuery = 'Obelisco, Buenos Aires';

async function testGoogleKey() {
  console.log(`🧪 Probando Google API Key: ${GOOGLE_KEY.substring(0, 10)}...`);
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(testQuery)}&key=${GOOGLE_KEY}`
    );
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log('✅ API de Google FUNCIONANDO correctamente.');
      console.log('📍 Resultado:', data.results[0].formatted_address);
    } else {
      console.error('❌ Google devolvió un ERROR:', data.status);
      if (data.error_message) {
        console.error('📝 Mensaje de Google:', data.error_message);
      }
      console.log('\n💡 Sugerencia: Revisa en Google Cloud Console que la "Geocoding API" esté habilitada y que la cuenta tenga facturación (Billing) activa.');
    }
  } catch (error) {
    console.error('❌ Error de conexión con Google:', error);
  }
}

testGoogleKey();
