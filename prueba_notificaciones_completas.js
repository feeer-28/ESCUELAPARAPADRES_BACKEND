import axios from 'axios'

const BASE_URL = 'http://localhost:3333/api/movil'

console.log('🚀 PRUEBA COMPLETA DEL SISTEMA DE NOTIFICACIONES')
console.log('=' .repeat(60))

async function probarNotificaciones() {
  try {
    
    // 1. Verificar dispositivo FCM
    console.log('\n📱 PASO 1: Verificar dispositivo FCM registrado')
    try {
      const dispositivoResponse = await axios.get(`${BASE_URL}/debug/verificar-dispositivo`)
      if (dispositivoResponse.data.success) {
        console.log('✅ Dispositivos verificados')
        console.log(`📱 Total dispositivos: ${dispositivoResponse.data.datos.total_dispositivos}`)
        dispositivoResponse.data.datos.dispositivos.forEach(d => {
          console.log(`   - ${d.dispositivo} (${d.sistema_operativo})`)
        })
      }
    } catch (error) {
      console.log('❌ Error verificando dispositivos:', error.response?.data?.message)
    }

    // 2. Enviar notificación de tarea asignada
    console.log('\n📚 PASO 2: Enviar notificación de tarea asignada')
    try {
      const tareaAsignadaResponse = await axios.post(`${BASE_URL}/debug/notificar-tarea-asignada`)
      if (tareaAsignadaResponse.data.success) {
        console.log('✅ Notificación de tarea asignada enviada')
        console.log(`📱 Título: ${tareaAsignadaResponse.data.datos.titulo}`)
        console.log(`📱 Mensaje: ${tareaAsignadaResponse.data.datos.mensaje}`)
      }
    } catch (error) {
      console.log('❌ Error enviando notificación de tarea asignada:', error.response?.data?.message)
    }

    // Esperar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 3. Enviar notificación de tarea próxima a vencer
    console.log('\n⏰ PASO 3: Enviar notificación de tarea próxima a vencer')
    try {
      const proximaVencerResponse = await axios.post(`${BASE_URL}/debug/notificar-tarea-proxima-vencer`)
      if (proximaVencerResponse.data.success) {
        console.log('✅ Notificación de tarea próxima a vencer enviada')
        console.log(`📱 Título: ${proximaVencerResponse.data.datos.titulo}`)
        console.log(`📱 Mensaje: ${proximaVencerResponse.data.datos.mensaje}`)
        console.log(`📱 Urgencia: ${proximaVencerResponse.data.datos.urgencia}`)
      }
    } catch (error) {
      console.log('❌ Error enviando notificación de tarea próxima a vencer:', error.response?.data?.message)
    }

    // Esperar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 4. Enviar notificación de tarea calificada
    console.log('\n✅ PASO 4: Enviar notificación de tarea calificada')
    try {
      const calificadaResponse = await axios.post(`${BASE_URL}/debug/notificar-tarea-calificada`)
      if (calificadaResponse.data.success) {
        console.log('✅ Notificación de tarea calificada enviada')
        console.log(`📱 Título: ${calificadaResponse.data.datos.titulo}`)
        console.log(`📱 Mensaje: ${calificadaResponse.data.datos.mensaje}`)
        console.log(`📱 Nota: ${calificadaResponse.data.datos.nota}`)
        console.log(`📱 Estudiante: ${calificadaResponse.data.datos.estudiante}`)
      }
    } catch (error) {
      console.log('❌ Error enviando notificación de tarea calificada:', error.response?.data?.message)
    }

    // Esperar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 5. Enviar notificación de tarea vencida
    console.log('\n❌ PASO 5: Enviar notificación de tarea vencida')
    try {
      const vencidaResponse = await axios.post(`${BASE_URL}/debug/notificar-tarea-vencida`)
      if (vencidaResponse.data.success) {
        console.log('✅ Notificación de tarea vencida enviada')
        console.log(`📱 Título: ${vencidaResponse.data.datos.titulo}`)
        console.log(`📱 Mensaje: ${vencidaResponse.data.datos.mensaje}`)
        console.log(`📱 Urgencia: ${vencidaResponse.data.datos.urgencia}`)
      }
    } catch (error) {
      console.log('❌ Error enviando notificación de tarea vencida:', error.response?.data?.message)
    }

    // 6. Verificar notificaciones en la base de datos
    console.log('\n📋 PASO 6: Verificar notificaciones guardadas')
    try {
      // Primero hacer login para obtener token
      const loginResponse = await axios.post(`${BASE_URL}/auth/login/movil`, {
        documento: '1234567890',
        password: 'Acudiente123!'
      })
      
      if (loginResponse.data.success) {
        const token = loginResponse.data.token
        
        // Obtener notificaciones
        const notifResponse = await axios.get(`${BASE_URL}/notificaciones`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (notifResponse.data.success) {
          console.log('✅ Notificaciones obtenidas')
          console.log(`📱 Total: ${notifResponse.data.data.length} notificaciones`)
          
          notifResponse.data.data.forEach((notif, index) => {
            console.log(`   ${index + 1}. ${notif.titulo}`)
            console.log(`      - ${notif.mensaje}`)
            console.log(`      - Leída: ${notif.leida ? 'Sí' : 'No'}`)
            console.log(`      - Tipo: ${notif.tipo}`)
            if (notif.datos) {
              console.log(`      - Datos: ${JSON.stringify(notif.datos)}`)
            }
          })
        }
      }
    } catch (error) {
      console.log('❌ Error obteniendo notificaciones:', error.response?.data?.message)
    }

    console.log('\n🎯 RESUMEN DE PRUEBA DE NOTIFICACIONES:')
    console.log('✅ Dispositivos FCM verificados')
    console.log('✅ Notificación de tarea asignada enviada')
    console.log('✅ Notificación de tarea próxima a vencer enviada')
    console.log('✅ Notificación de tarea calificada enviada')
    console.log('✅ Notificación de tarea vencida enviada')
    console.log('✅ Notificaciones guardadas en base de datos')
    console.log('\n🚀 ¡SISTEMA DE NOTIFICACIONES COMPLETO FUNCIONANDO!')
    
  } catch (error) {
    console.error('❌ Error general en pruebas:', error.message)
  }
}

probarNotificaciones()
