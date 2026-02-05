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
    // Verificar que la API de credenciales está disponible (compatibilidad de versión)
    if (!admin || !admin.credential || typeof (admin.credential as any).cert !== 'function') {
      console.warn('⚠️ Firebase Admin credential API no disponible. Omite inicialización.')
      return null
    }

    // Opción 1: Usar SERVICE_ACCOUNT_KEY como string JSON

    const serviceAccountKey = env.get('FIREBASE_SERVICE_ACCOUNT_KEY')

    

    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey)
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as any),
        })
        console.log('✅ Firebase inicializado correctamente')
        return firebaseApp
      } catch (e) {
        console.warn('⚠️ SERVICE_ACCOUNT_KEY inválido. Verifica que sea JSON válido.')
      }
    }



    // Opción 2: Usar SERVICE_ACCOUNT_PATH (archivo JSON)

    const serviceAccountPath = env.get('FIREBASE_SERVICE_ACCOUNT_PATH')

    

    if (serviceAccountPath) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const serviceAccount = require(serviceAccountPath)
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as any),
        })
        console.log('✅ Firebase inicializado correctamente desde archivo')
        return firebaseApp
      } catch (e) {
        console.warn('⚠️ No se pudo leer SERVICE_ACCOUNT_PATH. Verifica la ruta al archivo JSON.')
      }
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

