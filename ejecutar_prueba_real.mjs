import axios from 'axios';

// Tu URL de ngrok
const BASE_URL = 'https://churnable-nimbly-norbert.ngrok-free.dev/api/movil';

// El token que me proporcionaste
const TOKEN_MOVIL = 'cIx9CFkiQryfdcH2k1zzQ3:APA91bFAksBJIFbtAParM8Kyz6eSPPTsJBJn9I33Api5BE6t6rcRJ06ZqCM_1KmOq2vd8UReDiSf-1uEWAUqMp3Hflh9QapxBeLHs0hpHiRUaAafD6v0AaY';

console.log('🚀 EJECUTANDO PRUEBA DE FLUJO REAL');
console.log('==================================');
console.log(`📱 Token: ${TOKEN_MOVIL.substring(0, 20)}...`);

async function ejecutar() {
  try {
    console.log('\n1️⃣  Solicitando al backend crear tarea y notificar...');
    
    const response = await axios.post(`${BASE_URL}/debug/notificar-tarea-asignada`, {
      token: TOKEN_MOVIL
    });

    if (response.data.success) {
      console.log('\n✅ ¡ÉXITO! El backend respondió correctamente.');
      console.log('---------------------------------------------');
      console.log(`📝 Tarea creada ID: ${response.data.datos.asignacion_id}`);
      console.log(`📚 Título: ${response.data.datos.titulo}`);
      console.log(`👤 Usuario ID: ${response.data.datos.usuario_id}`);
      console.log('---------------------------------------------');
      console.log('\n👀 AHORA REVISA TU CELULAR:');
      console.log('   1. Debería haber llegado una notificación "Nueva Tarea Asignada".');
      console.log('   2. Al abrir la app y recargar, debería aparecer la tarea.');
    } else {
      console.log('❌ El backend reportó un error:', response.data.message);
    }

  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    if (error.response) {
      console.error('   Detalle:', error.response.data);
    }
  }
}

ejecutar();
