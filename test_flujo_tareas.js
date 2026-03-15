// Script completo para probar el flujo de tareas orientador -> acudiente
import fetch from 'node-fetch'

const BASE_URL = 'http://127.0.0.1:3333/api'

// Credenciales 
const ORIENTADOR = {
  correo: 'orientador@gmail.com',
  password: 'Orientador321!'
}

const ACUDIENTE = {
  documento: '1234567890',
  password: '1234567890'
}

let orientadorToken = ''
let acudienteToken = ''
let estudianteId = 0

async function loginOrientador() {
  console.log('🔐 Login como orientador...')
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ORIENTADOR)
  })
  
  const result = await response.json()
  console.log('📞 Status:', response.status)
  console.log('✅ Respuesta:', JSON.stringify(result, null, 2))
  
  if (result.token) {
    orientadorToken = result.token
    console.log('🔑 Token orientador obtenido!')
  } else {
    throw new Error('No se pudo obtener token del orientador')
  }
}

async function loginAcudiente() {
  console.log('\n🔐 Login como acudiente...')
  const response = await fetch(`${BASE_URL}/movil/auth/login/movil`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ACUDIENTE)
  })
  
  const result = await response.json()
  console.log('📞 Status:', response.status)
  console.log('✅ Respuesta:', JSON.stringify(result, null, 2))
  
  if (result.token) {
    acudienteToken = result.token
    console.log('🔑 Token acudiente obtenido!')
    
    if (result.estudiantes && result.estudiantes.length > 0) {
      estudianteId = result.estudiantes[0].id
      console.log('👨‍🎓 ID del estudiante:', estudianteId)
    }
  } else {
    throw new Error('No se pudo obtener token del acudiente')
  }
}

async function obtenerDatosParaTarea() {
  console.log('\n📚 Obteniendo datos para crear tarea...')
  
  // Obtener banco de tareas
  const bancoResponse = await fetch(`${BASE_URL}/banco-tareas`, {
    headers: { 'Authorization': `Bearer ${orientadorToken}` }
  })
  const bancoTareas = await bancoResponse.json()
  console.log('📋 Banco de tareas:', JSON.stringify(bancoTareas, null, 2))
  
  // Obtener períodos
  const periodosResponse = await fetch(`${BASE_URL}/periodos`, {
    headers: { 'Authorization': `Bearer ${orientadorToken}` }
  })
  const periodos = await periodosResponse.json()
  console.log('📅 Períodos:', JSON.stringify(periodos, null, 2))
  
  // Obtener cursos
  const cursosResponse = await fetch(`${BASE_URL}/cursos`, {
    headers: { 'Authorization': `Bearer ${orientadorToken}` }
  })
  const cursos = await cursosResponse.json()
  console.log('🏫 Cursos:', JSON.stringify(cursos, null, 2))
  
  return { bancoTareas, periodos, cursos }
}

async function crearTarea(bancoTareaId, cursoId, periodoId) {
  console.log('\n📝 Creando tarea como orientador...')
  
  const tareaData = {
    bancoTareaId: bancoTareaId,
    cursoId: cursoId,  
    periodoId: periodoId,
    fechaInicio: new Date().toISOString(),
    fechaVencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
  }
  
  console.log('📦 Datos de tarea:', JSON.stringify(tareaData, null, 2))
  
  const response = await fetch(`${BASE_URL}/asignaciones/orientador`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orientadorToken}`
    },
    body: JSON.stringify(tareaData)
  })
  
  const result = await response.json()
  console.log('📞 Status:', response.status)
  console.log('✅ Respuesta:', JSON.stringify(result, null, 2))
  
  return result
}

async function consultarTareasEstudiante() {
  console.log('\n👀 Consultando tareas del estudiante como acudiente...')
  
  const response = await fetch(`${BASE_URL}/estudiantes/${estudianteId}/tareas`, {
    headers: { 'Authorization': `Bearer ${acudienteToken}` }
  })
  
  const result = await response.json()
  console.log('📞 Status:', response.status)
  console.log('✅ Respuesta:', JSON.stringify(result, null, 2))
  
  return result
}

async function consultarNotificaciones() {
  console.log('\n🔔 Consultando notificaciones del acudiente...')
  
  const response = await fetch(`${BASE_URL}/notificaciones`, {
    headers: { 'Authorization': `Bearer ${acudienteToken}` }
  })
  
  const result = await response.json()
  console.log('📞 Status:', response.status)
  console.log('✅ Respuesta:', JSON.stringify(result, null, 2))
  
  return result
}

async function main() {
  try {
    // 1. Login como orientador
    await loginOrientador()
    
    // 2. Login como acudiente
    await loginAcudiente()
    
    // 3. Obtener datos necesarios
    const { bancoTareas, periodos, cursos } = await obtenerDatosParaTarea()
    
    // Si encontramos datos, crear la tarea
    if (bancoTareas && bancoTareas.length > 0 && periodos && periodos.length > 0 && cursos && cursos.length > 0) {
      const bancoTareaId = bancoTareas[0].id || bancoTareas[0]
      const periodoId = periodos[0].id || periodos[0] 
      const cursoId = cursos[0].id || cursos[0]
      
      // 4. Crear tarea
      const tarea = await crearTarea(bancoTareaId, cursoId, periodoId)
      
      // 5. Verificar que aparece en las tareas del estudiante
      await consultarTareasEstudiante()
      
      // 6. Verificar notificaciones
      await consultarNotificaciones()
    } else {
      console.log('❌ No se encontraron datos suficientes para crear la tarea')
    }
    
    console.log('\n🎉 ¡Prueba completada!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

main()