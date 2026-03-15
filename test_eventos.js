// ==========================================
// PRUEBA DE ENDPOINTS DE EVENTOS
// ==========================================

import axios from 'axios';

const BASE_URL = 'http://localhost:3333';

async function testEndpoints() {
  console.log('🚀 Probando endpoints de eventos...\n');

  try {
    // 1. Health check
    console.log('1. Health Check:');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health:', health.data);
    console.log('');

    // 2. Listar eventos (sin autenticación - debe dar error)
    console.log('2. Listar eventos (sin auth):');
    try {
      await axios.get(`${BASE_URL}/api/eventos`);
    } catch (error) {
      console.log('✅ Error esperado (sin auth):', error.response.status);
    }
    console.log('');

    // 3. Probar login móvil para obtener token
    console.log('3. Login móvil:');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/movil/auth/login/movil`, {
        documento: '1098765432',
        password: 'Acudiente123'
      });
      console.log('✅ Login exitoso');
      console.log('');

      // 4. Listar eventos con token
      console.log('4. Listar eventos (con auth):');
      const eventosResponse = await axios.get(`${BASE_URL}/api/eventos`, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      console.log('✅ Eventos:', eventosResponse.data);
      console.log('');

      // 5. Crear evento
      console.log('5. Crear evento:');
      const nuevoEvento = await axios.post(`${BASE_URL}/api/eventos`, {
        titulo: 'Evento de Prueba',
        descripcion: 'Este es un evento de prueba',
        tipo_evento: 'reunion',
        fecha_evento: '2026-02-15T18:00:00Z',
        fecha_recordatorio: '2026-02-14T18:00:00Z'
      }, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Evento creado:', nuevoEvento.data);
      console.log('');

      // 6. Listar eventos próximos
      console.log('6. Eventos próximos:');
      const proximosResponse = await axios.get(`${BASE_URL}/api/eventos/proximos`, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      console.log('✅ Eventos próximos:', proximosResponse.data);
      console.log('');

      // 7. Probar endpoint de dispositivos
      console.log('7. Registrar dispositivo:');
      const dispositivoResponse = await axios.post(`${BASE_URL}/api/movil/dispositivos/registrar`, {
        token_fcm: 'test_token_fcm_12345',
        plataforma: 'android',
        version_app: '1.0.0'
      }, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Dispositivo registrado:', dispositivoResponse.data);
      console.log('');

      console.log('🎉 ¡Todos los endpoints funcionan correctamente!');
      
    } catch (loginError) {
      console.log('❌ Error en login:', loginError.response?.data || loginError.message);
    }

  } catch (error) {
    console.log('❌ Error general:', error.response?.data || error.message);
  }
}

testEndpoints();
