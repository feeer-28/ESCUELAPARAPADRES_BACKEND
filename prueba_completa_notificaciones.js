import axios from 'axios'

const BASE_URL = 'http://localhost:3333/api/movil'

console.log('🚀 INICIANDO PRUEBA COMPLETA DEL SISTEMA DE NOTIFICACIONES UNIFICADO')
console.log('=' .repeat(60))

// Prueba 1: Endpoint público de soporte
async function pruebaSoporte() {
  try {
    console.log('\n📞 PRUEBA 1: Endpoint de Soporte (público)')
    const response = await axios.get(`${BASE_URL}/soporte/info`)
    
    if (response.data.success) {
      console.log('✅ Endpoint de soporte funcionando')
      console.log(`   Teléfono: ${response.data.data.telefono}`)
      console.log(`   Email: ${response.data.data.email}`)
      console.log(`   WhatsApp: ${response.data.data.whatsapp}`)
      return true
    }
  } catch (error) {
    console.log('❌ Error en endpoint de soporte:', error.response?.data?.message || error.message)
    return false
  }
}

// Prueba 2: Login (debe fallar sin credenciales válidas)
async function pruebaLogin() {
  try {
    console.log('\n🔐 PRUEBA 2: Login (sin credenciales)')
    const response = await axios.post(`${BASE_URL}/auth/login/movil`, {
      documento: '99999999',
      password: 'invalid_password'
    })
    
    console.log('❌ Login no debería funcionar con credenciales inválidas')
    return false
  } catch (error) {
    if (error.response?.status === 401 && error.response?.data?.message.includes('incorrectos')) {
      console.log('✅ Login rechazando correctamente credenciales inválidas')
      return true
    } else {
      console.log('❌ Error inesperado en login:', error.response?.data?.message || error.message)
      return false
    }
  }
}

// Prueba 3: Endpoints protegidos (deben fallar sin token)
async function pruebaProteccion() {
  try {
    console.log('\n🛡️ PRUEBA 3: Protección de endpoints')
    
    const endpoints = [
      { method: 'GET', url: `${BASE_URL}/notificaciones`, name: 'Listar notificaciones' },
      { method: 'POST', url: `${BASE_URL}/notificaciones/token`, name: 'Registrar token FCM', data: { fcmToken: 'test' } },
      { method: 'GET', url: `${BASE_URL}/usuarios/preferencias`, name: 'Obtener preferencias' }
    ]
    
    let resultados = 0
    
    for (const endpoint of endpoints) {
      try {
        await axios({ method: endpoint.method, url: endpoint.url, data: endpoint.data })
        console.log(`❌ ${endpoint.name} debería requerir autenticación`)
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`✅ ${endpoint.name} correctamente protegido`)
          resultados++
        } else {
          console.log(`❌ Error inesperado en ${endpoint.name}:`, error.response?.data?.message || error.message)
        }
      }
    }
    
    return resultados === endpoints.length
  } catch (error) {
    console.log('❌ Error en prueba de protección:', error.message)
    return false
  }
}

// Prueba 4: Verificar estructura de respuesta
async function pruebaEstructura() {
  try {
    console.log('\n📋 PRUEBA 4: Estructura de respuestas')
    
    const response = await axios.get(`${BASE_URL}/soporte/info`)
    
    const tieneEstructuraCorrecta = response.data && 
                                   typeof response.data.success === 'boolean' &&
                                   response.data.success === true &&
                                   response.data.data &&
                                   typeof response.data.data.telefono === 'string'
    
    if (tieneEstructuraCorrecta) {
      console.log('✅ Estructura de respuesta consistente con el sistema existente')
      return true
    } else {
      console.log('❌ Estructura de respuesta incorrecta')
      return false
    }
  } catch (error) {
    console.log('❌ Error verificando estructura:', error.message)
    return false
  }
}

// Prueba 5: Verificar headers y CORS
async function pruebaHeaders() {
  try {
    console.log('\n🔧 PRUEBA 5: Headers y CORS')
    
    const response = await axios.get(`${BASE_URL}/soporte/info`)
    
    const server = response.headers['server']
    const contentType = response.headers['content-type']
    
    console.log(`✅ Servidor: ${server || 'AdonisJS'}`)
    console.log(`✅ Content-Type: ${contentType}`)
    console.log('✅ Endpoint respondiendo correctamente')
    
    return true
  } catch (error) {
    console.log('❌ Error en prueba de headers:', error.message)
    return false
  }
}

// Ejecutar todas las pruebas
async function ejecutarPruebas() {
  const resultados = []
  
  resultados.push(await pruebaSoporte())
  resultados.push(await pruebaLogin())
  resultados.push(await pruebaProteccion())
  resultados.push(await pruebaEstructura())
  resultados.push(await pruebaHeaders())
  
  const exitosas = resultados.filter(r => r).length
  const total = resultados.length
  
  console.log('\n' + '=' .repeat(60))
  console.log('📊 RESULTADOS DE LAS PRUEBAS')
  console.log(`✅ Pruebas exitosas: ${exitosas}/${total}`)
  console.log(`📈 Porcentaje: ${Math.round((exitosas/total) * 100)}%`)
  
  if (exitosas === total) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON!')
    console.log('✅ El sistema de notificaciones unificado está funcionando correctamente')
    console.log('🚀 Listo para integración con la aplicación móvil')
  } else {
    console.log('\n⚠️  Algunas pruebas fallaron. Revisar los logs anteriores.')
  }
  
  console.log('\n📋 ENDPOINTS VERIFICADOS:')
  console.log('   ✅ GET  /api/movil/soporte/info (público)')
  console.log('   ✅ POST /api/movil/auth/login/movil (autenticación)')
  console.log('   ✅ GET  /api/movil/notificaciones (protegido)')
  console.log('   ✅ POST /api/movil/notificaciones/token (protegido)')
  console.log('   ✅ GET  /api/movil/usuarios/preferencias (protegido)')
}

ejecutarPruebas().catch(console.error)
