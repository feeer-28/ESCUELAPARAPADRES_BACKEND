import env from '#start/env'
import admin from 'firebase-admin'
import path from 'path'
import fs from 'fs'



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
        console.log('🔍 SERVICE_ACCOUNT_KEY encontrado, longitud:', serviceAccountKey.length)
        console.log('🔍 Primeros 100 caracteres:', serviceAccountKey.substring(0, 100))
        console.log('🔍 Últimos 50 caracteres:', serviceAccountKey.substring(serviceAccountKey.length - 50))
        console.log('🔍 Admin disponible:', typeof admin)
        console.log('🔍 Admin credential disponible:', typeof admin.credential)
        
        const serviceAccount = JSON.parse(serviceAccountKey)
        console.log('✅ JSON parseado correctamente, project_id:', serviceAccount.project_id)
        
        // Debug: ver qué hay en la private key antes de procesar
        console.log('🔍 Private key ANTES - primeros 100 chars:', serviceAccount.private_key.substring(0, 100))
        console.log('🔍 Contiene \\n literales:', serviceAccount.private_key.includes('\\n'))
        console.log('🔍 Contiene saltos de línea reales:', serviceAccount.private_key.includes('\n'))
        
        // Corregir los saltos de línea en la private key
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
          console.log('🔧 Private key corregida, longitud:', serviceAccount.private_key.length)
          console.log('🔍 Private key DESPUÉS - primeros 100 chars:', serviceAccount.private_key.substring(0, 100))
        }
        
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as any),
        })
        console.log('🎉 Firebase inicializado correctamente')
        return firebaseApp
      } catch (e) {
        console.error('❌ Error detallado al parsear JSON:', e.message)
        console.error('❌ Tipo de error:', e.name)
        console.warn('⚠️ SERVICE_ACCOUNT_KEY inválido. Verifica que sea JSON válido.')
      }
    }



    // Opción 2: Usar SERVICE_ACCOUNT_PATH (archivo JSON)
    const serviceAccountPath = env.get('FIREBASE_SERVICE_ACCOUNT_PATH')
    
    if (serviceAccountPath) {
      try {
        console.log(`🔍 Intentando cargar Firebase desde ruta: ${serviceAccountPath}`)
        
        // Resolver ruta absoluta para mayor compatibilidad  
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

