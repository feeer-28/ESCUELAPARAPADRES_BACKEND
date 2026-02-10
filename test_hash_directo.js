// Test directo del servicio de hash
const url = 'http://127.0.0.1:3333/api/movil/debug/test-hash'

console.log('🔧 Probando servicio de hash directamente...')
console.log('==================================================')

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({})
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