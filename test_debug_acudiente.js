// Test de debug para verificar si existe el acudiente
const url = 'http://127.0.0.1:3333/api/movil/debug/acudiente'
const data = {
  documento: '1061705869'
}

console.log('🔍 Verificando si existe acudiente...')
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
})
.catch(error => {
  console.error('💥 Error:', error.message)
})