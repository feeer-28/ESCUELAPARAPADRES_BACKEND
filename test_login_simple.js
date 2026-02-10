// Test simple del endpoint de login
const url = 'http://127.0.0.1:3333/api/movil/auth/login/movil'
const data = {
  documento: '1061705869',
  password: '1061705869'
}

console.log('🔍 Probando login del acudiente...')
console.log('📍 URL:', url)
console.log('📄 Data:', data)
console.log('==================================================')

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data)
})
.then(response => {
  console.log('📞 Status:', response.status, response.statusText)
  return response.json()
})
.then(result => {
  console.log('✅ Respuesta:')
  console.log(JSON.stringify(result, null, 2))
  
  if (result.success) {
    console.log('🎉 Login exitoso!')
    console.log('👤 Usuario:', result.data?.usuario?.nombres, result.data?.usuario?.apellidos)
  } else {
    console.log('❌ Login falló:', result.message)
  }
})
.catch(error => {
  console.error('💥 Error:', error.message)
})