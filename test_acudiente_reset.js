// Test usando el acudienteController para resetear y movilController para login
const resetUrl = 'http://127.0.0.1:3333/api/acudientes/reset-password' // Endpoint correcto de acudientes
const loginUrl = 'http://127.0.0.1:3333/api/movil/auth/login/movil'

const documento = '1061705869'

console.log('🔧 Reseteando contraseña con acudienteController...')
console.log('📄 Documento:', documento)
console.log('==================================================')

// Paso 1: Resetear contraseña usando acudienteController
fetch(resetUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ numeroDocumento: documento })
})
.then(response => response.json())
.then(resetResult => {
  console.log('✅ Reseteo con acudienteController:')
  console.log(JSON.stringify(resetResult, null, 2))
  
  if (resetResult.success !== false) {
    console.log('\n🔍 Intentando login con movilController...')
    
    // Paso 2: Probar login con movilController
    return fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documento,
        password: documento
      })
    })
  } else {
    throw new Error('Error en reseteo: ' + resetResult.message)
  }
})
.then(response => {
  console.log('📞 Login Status:', response.status, response.statusText)
  return response.json()
})
.then(loginResult => {
  console.log('✅ Resultado login:')
  console.log(JSON.stringify(loginResult, null, 2))
  
  if (loginResult.success) {
    console.log('\n🎉 ¡LOGIN EXITOSO!')
    console.log('👤 Usuario:', loginResult.user?.firstName)
    console.log('🔑 Token generado:', loginResult.token ? 'SÍ' : 'NO')
  } else {
    console.log('\n❌ Login aún falla:', loginResult.message)
  }
})
.catch(error => {
  console.error('💥 Error:', error.message)
})