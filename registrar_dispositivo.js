import axios from 'axios'

const BASE_URL = 'http://localhost:3333/api/movil'

async function registrarDispositivo() {
  try {
    console.log('📱 Registrando dispositivo FCM de prueba...')
    
    // Login para obtener token
    const loginResponse = await axios.post(`${BASE_URL}/auth/login/movil`, {
      documento: '1234567890',
      password: 'Acudiente123!'
    })
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.token
      console.log('✅ Login exitoso')
      
      // Registrar token FCM
      const fcmResponse = await axios.post(
        `${BASE_URL}/notificaciones/token`,
        {
          fcmToken: 'test_fcm_token_android_demo_123456',
          dispositivo: 'Samsung Galaxy S21 Demo',
          sistemaOperativo: 'Android 12',
          versionApp: '1.0.0'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (fcmResponse.data.success) {
        console.log('✅ Dispositivo FCM registrado exitosamente')
        console.log(`📱 Token: ${fcmResponse.data.data.token_fcm}`)
        console.log(`📱 Dispositivo: ${fcmResponse.data.data.dispositivo}`)
      } else {
        console.log('❌ Error registrando dispositivo:', fcmResponse.data.message)
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message)
  }
}

registrarDispositivo()
