import axios from 'axios'

// Reemplaza con tu URL de ngrok
const NGROK_URL = 'https://churnable-nimbly-norbert.ngrok-free.dev/api/movil'

console.log('🌐 VERIFICANDO NGROK')
console.log(`URL: ${NGROK_URL}`)

async function verificarNgrok() {
  try {
    // Probar endpoint de soporte
    const response = await axios.get(`${NGROK_URL}/soporte/info`)
    
    if (response.data.success) {
      console.log('✅ NGROK FUNCIONANDO!')
      console.log('📱 Datos recibidos:')
      console.log(`   Teléfono: ${response.data.data.telefono}`)
      console.log(`   Email: ${response.data.data.email}`)
      console.log(`   WhatsApp: ${response.data.data.whatsapp}`)
      
      console.log('\n🎯 LISTO PARA ANDROID!')
      console.log(`Usa esta URL en tu app: ${NGROK_URL}`)
      
    } else {
      console.log('❌ Error en respuesta de ngrok')
    }
  } catch (error) {
    console.log('❌ Error verificando ngrok:', error.message)
    console.log('🔍 Asegúrate de que ngrok esté corriendo en otra terminal')
  }
}

verificarNgrok()
