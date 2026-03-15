import { getMessaging } from '#config/firebase'

console.log('🔥 VERIFICANDO CONFIGURACIÓN FIREBASE')

try {
  const messaging = getMessaging()
  
  if (messaging) {
    console.log('✅ Firebase Messaging está disponible')
    console.log('🔥 Listo para enviar notificaciones push reales')
  } else {
    console.log('❌ Firebase Messaging no está disponible')
    console.log('🔍 Revisa la configuración en config/firebase.ts')
  }
} catch (error) {
  console.error('❌ Error en Firebase:', error.message)
  console.log('🔍 Revisa las variables de entorno:')
  console.log('   - FIREBASE_SERVICE_ACCOUNT_KEY')
  console.log('   - FIREBASE_SERVICE_ACCOUNT_PATH')
}
