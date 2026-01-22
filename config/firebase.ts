import env from '#start/env'
import * as admin from 'firebase-admin'

let firebaseApp: admin.app.App | null = null

/**
 * Inicializar Firebase Admin SDK
 */
function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp
  }

  try {
    // Opción 1: Usar SERVICE_ACCOUNT_KEY como string JSON
    const serviceAccountKey = env.get('FIREBASE_SERVICE_ACCOUNT_KEY')
    
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey)
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      console.log('✅ Firebase inicializado correctamente')
      return firebaseApp
    }

    // Opción 2: Usar SERVICE_ACCOUNT_PATH (archivo JSON)
    const serviceAccountPath = env.get('FIREBASE_SERVICE_ACCOUNT_PATH')
    
    if (serviceAccountPath) {
      const serviceAccount = require(serviceAccountPath)
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      console.log('✅ Firebase inicializado correctamente desde archivo')
      return firebaseApp
    }

    console.warn('⚠️ Firebase no inicializado: No se encontró FIREBASE_SERVICE_ACCOUNT_KEY ni FIREBASE_SERVICE_ACCOUNT_PATH')
    return null
  } catch (error) {
    console.error('❌ Error al inicializar Firebase:', error)
    return null
  }
}

/**
 * Obtener instancia de Firebase Messaging
 */
function getMessaging() {
  if (!firebaseApp) {
    firebaseApp = initializeFirebase()
  }

  if (!firebaseApp) {
    return null
  }

  return admin.messaging()
}

export { initializeFirebase, getMessaging }
export default { initializeFirebase, getMessaging }
