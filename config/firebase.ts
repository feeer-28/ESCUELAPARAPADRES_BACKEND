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
    console.log('🔄 Iniciando configuración de Firebase...')

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
        console.log(`🔍 Intentando cargar Firebase desde ruta: ${serviceAccountPath}`)
        
        // Resolver ruta absoluta para mayor compatibilidad  
        const path = require('path')
        const fs = require('fs')
        
        let resolvedPath = serviceAccountPath
        if (!path.isAbsolute(serviceAccountPath)) {
          resolvedPath = path.resolve(process.cwd(), serviceAccountPath)
        }
        
        console.log(`📂 Ruta resuelta: ${resolvedPath}`)
        console.log(`📁 Directorio actual: ${process.cwd()}`)
        
        // Verificar que el archivo existe
        if (fs.existsSync(resolvedPath)) {
          console.log('✅ Archivo de credenciales encontrado')
          const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'))
          firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as any),
          })
          console.log('🎉 Firebase inicializado correctamente desde archivo!')
          return firebaseApp
        } else {
          console.warn(`❌ Archivo no encontrado en: ${resolvedPath}`)
          
          // Debug adicional: listar archivos en directorio
          try {
            const dirPath = path.dirname(resolvedPath)
            const files = fs.readdirSync(dirPath)
            console.log(`📋 Archivos disponibles en ${dirPath}:`, files.filter(f => f.includes('firebase')))
          } catch (listError) {
            console.warn('⚠️ No se pudo listar el directorio:', listError.message)
          }
        }
      } catch (e) {
        console.warn('⚠️ Error al leer SERVICE_ACCOUNT_PATH:', e.message)
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

