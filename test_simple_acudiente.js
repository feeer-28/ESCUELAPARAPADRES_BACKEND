// Script simplificado para probar el flujo con PowerShell
// Solo probaremos el lado del acudiente primero

console.log('🔐 Iniciando prueba del login del acudiente...')

// Test 1: Login del acudiente que sabemos que funciona
fetch('http://127.0.0.1:3333/api/movil/auth/login/movil', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documento: '1234567890',
    password: '1234567890'
  })
})
.then(async response => {
  console.log('📞 Status:', response.status)
  const result = await response.json()
  console.log('✅ Respuesta del login acudiente:')
  console.log(JSON.stringify(result, null, 2))
  
  if (result.token && result.estudiantes && result.estudiantes.length > 0) {
    const token = result.token
    const estudianteId = result.estudiantes[0].id
    
    console.log('🔑 Token obtenido:', token.substring(0, 20) + '...')
    console.log('👨‍🎓 ID del estudiante:', estudianteId)
    
    // Test 2: Consultar tareas del estudiante
    console.log('\n📚 Consultando tareas actuales del estudiante...')
    return fetch(`http://127.0.0.1:3333/api/estudiantes/${estudianteId}/tareas`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
  } else {
    throw new Error('No se pudo obtener token o estudiantes del acudiente')
  }
})
.then(async response => {
  console.log('📞 Status tareas:', response.status)
  const tareas = await response.json()
  console.log('✅ Tareas actuales del estudiante:')
  console.log(JSON.stringify(tareas, null, 2))
})
.catch(error => {
  console.error('❌ Error:', error.message)
})