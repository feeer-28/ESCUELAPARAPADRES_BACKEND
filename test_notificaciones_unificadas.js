import axios from 'axios'

const BASE_URL = 'http://localhost:3333/api/movil'

// Configuración
const config = {
  headers: {
    'Content-Type': 'application/json'
  }
}

let authToken = null
let userId = null

// Función para hacer login y obtener token
async function login() {
  console.log('🔐 Iniciando sesión...')
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login/movil`, {
      documento: '12345678', // Reemplazar con documento válido
      password: 'password123' // Reemplazar con contraseña válida
    }, config)

    if (response.data.success) {
      authToken = response.data.token
      userId = response.data.user.id
      console.log('✅ Login exitoso')
      console.log(`📱 Usuario: ${response.data.user.firstName} ${response.data.user.lastName}`)
      console.log(`🏫 Institución ID: ${response.data.user.institucionId}`)
      return true
    } else {
      console.error('❌ Error en login:', response.data.message)
      return false
    }
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message)
    return false
  }
}

// Función para registrar token FCM
async function registrarTokenFCM() {
  console.log('\n📱 Registrando token FCM...')
  
  try {
    const response = await axios.post(`${BASE_URL}/notificaciones/token`, {
      fcmToken: 'test_fcm_token_' + Date.now(),
      dispositivo: 'Samsung Galaxy S21',
      sistemaOperativo: 'Android 12',
      versionApp: '1.0.0'
    }, {
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (response.data.success) {
      console.log('✅ Token FCM registrado exitosamente')
      return true
    } else {
      console.error('❌ Error al registrar token:', response.data.message)
      return false
    }
  } catch (error) {
    console.error('❌ Error al registrar token FCM:', error.response?.data || error.message)
    return false
  }
}

// Función para listar notificaciones
async function listarNotificaciones() {
  console.log('\n📋 Listando notificaciones...')
  
  try {
    const response = await axios.get(`${BASE_URL}/notificaciones?page=1&limit=10`, {
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (response.data.success) {
      console.log('✅ Notificaciones obtenidas')
      console.log(`📊 Total: ${response.data.meta.total}`)
      console.log(`🔔 No leídas: ${response.data.meta.noLeidas}`)
      console.log(`📄 Página: ${response.data.meta.page}/${response.data.meta.limit}`)
      
      if (response.data.data.length > 0) {
        console.log('\n📬 Notificaciones:')
        response.data.data.forEach((notif, index) => {
          console.log(`${index + 1}. ${notif.titulo} - ${notif.leida ? '✅ Leída' : '🔴 No leída'}`)
        })
      } else {
        console.log('📭 No hay notificaciones')
      }
      return true
    } else {
      console.error('❌ Error al listar notificaciones:', response.data.message)
      return false
    }
  } catch (error) {
    console.error('❌ Error al listar notificaciones:', error.response?.data || error.message)
    return false
  }
}

// Función para obtener preferencias
async function obtenerPreferencias() {
  console.log('\n⚙️ Obteniendo preferencias...')
  
  try {
    const response = await axios.get(`${BASE_URL}/usuarios/preferencias`, {
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (response.data.success) {
      console.log('✅ Preferencias obtenidas')
      console.log('🔔 Configuración de notificaciones:')
      Object.entries(response.data.data.notificaciones).forEach(([key, value]) => {
        console.log(`  ${key}: ${value ? '✅' : '❌'}`)
      })
      
      if (response.data.data.dispositivos.length > 0) {
        console.log('\n📱 Dispositivos registrados:')
        response.data.data.dispositivos.forEach((disp, index) => {
          console.log(`${index + 1}. ${disp.dispositivo} - ${disp.sistema_operativo}`)
        })
      }
      return true
    } else {
      console.error('❌ Error al obtener preferencias:', response.data.message)
      return false
    }
  } catch (error) {
    console.error('❌ Error al obtener preferencias:', error.response?.data || error.message)
    return false
  }
}

// Función para obtener info de soporte
async function infoSoporte() {
  console.log('\n🆘 Obteniendo información de soporte...')
  
  try {
    const response = await axios.get(`${BASE_URL}/soporte/info`, config)

    if (response.data.success) {
      console.log('✅ Información de soporte obtenida')
      console.log('📞 Contactos:')
      console.log(`  Teléfono: ${response.data.data.telefono}`)
      console.log(`  Email: ${response.data.data.email}`)
      console.log(`  WhatsApp: ${response.data.data.whatsapp}`)
      console.log(`  Horario: ${response.data.data.horario}`)
      console.log(`  Web: ${response.data.data.web}`)
      return true
    } else {
      console.error('❌ Error al obtener info de soporte:', response.data.message)
      return false
    }
  } catch (error) {
    console.error('❌ Error al obtener info de soporte:', error.response?.data || error.message)
    return false
  }
}

// Función principal de prueba
async function runTests() {
  console.log('🚀 Iniciando pruebas de notificaciones unificadas')
  console.log('=' .repeat(50))
  
  // 1. Login
  const loginSuccess = await login()
  if (!loginSuccess) {
    console.log('\n❌ No se puede continuar sin login exitoso')
    return
  }
  
  // 2. Registrar token FCM
  await registrarTokenFCM()
  
  // 3. Listar notificaciones
  await listarNotificaciones()
  
  // 4. Obtener preferencias
  await obtenerPreferencias()
  
  // 5. Info de soporte
  await infoSoporte()
  
  console.log('\n' + '=' .repeat(50))
  console.log('🏁 Pruebas completadas')
  console.log('📝 Nota: Para probar el envío de notificaciones reales,')
  console.log('   configura Firebase y usa el método estático enviarNotificacionPush')
}

// Ejecutar pruebas
runTests().catch(console.error)
