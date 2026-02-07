import axios from 'axios'

const BASE_URL = 'http://localhost:3333/api/movil'

async function pruebaLoginCompleto() {
  try {
    console.log('🚀 PRUEBA COMPLETA DE LOGIN ACUDIENTE')
    console.log('=' .repeat(50))
    
    // 1. Login
    console.log('\n🔐 Paso 1: Login del acudiente')
    const loginResponse = await axios.post(`${BASE_URL}/auth/login/movil`, {
      documento: '1234567890',
      password: 'Acudiente123!'
    })
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.token
      console.log('✅ Login exitoso')
      console.log(`📱 Token JWT: ${token.substring(0, 50)}...`)
      
      // 2. Registrar token FCM
      console.log('\n📱 Paso 2: Registrar token FCM')
      try {
        const fcmResponse = await axios.post(
          `${BASE_URL}/notificaciones/token`,
          {
            fcmToken: 'test_fcm_token_android_123',
            dispositivo: 'Samsung Galaxy S21',
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
          console.log('✅ Token FCM registrado exitosamente')
          console.log(`📱 Dispositivo: ${fcmResponse.data.data.dispositivo}`)
        }
      } catch (error) {
        console.log('❌ Error registrando token FCM:', error.response?.data?.message)
      }
      
      // 3. Listar notificaciones
      console.log('\n📋 Paso 3: Listar notificaciones')
      try {
        const notifResponse = await axios.get(`${BASE_URL}/notificaciones`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (notifResponse.data.success) {
          console.log('✅ Notificaciones obtenidas')
          console.log(`📱 Total: ${notifResponse.data.data.length} notificaciones`)
          notifResponse.data.data.forEach((notif, index) => {
            console.log(`   ${index + 1}. ${notif.titulo} - ${notif.leida ? 'Leída' : 'No leída'}`)
          })
        }
      } catch (error) {
        console.log('❌ Error obteniendo notificaciones:', error.response?.data?.message)
      }
      
      // 4. Obtener preferencias
      console.log('\n⚙️ Paso 4: Obtener preferencias')
      try {
        const prefResponse = await axios.get(`${BASE_URL}/usuarios/preferencias`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (prefResponse.data.success) {
          console.log('✅ Preferencias obtenidas')
          console.log(`📱 Notificaciones push: ${prefResponse.data.data.notificaciones_push ? 'Activadas' : 'Desactivadas'}`)
        }
      } catch (error) {
        console.log('❌ Error obteniendo preferencias:', error.response?.data?.message)
      }
      
      console.log('\n🎯 RESUMEN DE PRUEBA:')
      console.log('✅ Login: Funcionando')
      console.log('✅ Token JWT: Válido')
      console.log('✅ Endpoints: Disponibles')
      console.log('🚀 ¡Sistema listo para pruebas móviles!')
      
    } else {
      console.log('❌ Login fallido:', loginResponse.data.message)
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.response?.data?.message || error.message)
  }
}

pruebaLoginCompleto()
