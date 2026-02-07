import axios from 'axios'

const BASE_URL = 'https://churnable-nimbly-norbert.ngrok-free.dev/api/movil'

console.log('🚀 PRUEBA SIMPLE CON NGROK')
console.log('=' .repeat(40))

async function pruebaSimple() {
  try {
    
    // 1. Registrar dispositivo de prueba
    console.log('\n📱 Registrando dispositivo FCM...')
    const dispositivoResponse = await axios.post(`${BASE_URL}/debug/registrar-dispositivo-prueba`)
    if (dispositivoResponse.data.success) {
      console.log('✅ Dispositivo registrado')
    }

    // 2. Enviar notificación de tarea asignada
    console.log('\n📚 Enviando notificación de tarea asignada...')
    const tareaResponse = await axios.post(`${BASE_URL}/debug/notificar-tarea-asignada`)
    if (tareaResponse.data.success) {
      console.log('✅ Notificación enviada')
      console.log(`📱 ${tareaResponse.data.datos.titulo}`)
    }

    // 3. Enviar notificación de tarea calificada
    console.log('\n✅ Enviando notificación de tarea calificada...')
    const calificadaResponse = await axios.post(`${BASE_URL}/debug/notificar-tarea-calificada`)
    if (calificadaResponse.data.success) {
      console.log('✅ Notificación enviada')
      console.log(`📱 ${calificadaResponse.data.datos.titulo}`)
    }

    console.log('\n🎯 ¡PRUEBA COMPLETADA!')
    console.log('✅ Android recibirá estas notificaciones')
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message)
  }
}

pruebaSimple()
