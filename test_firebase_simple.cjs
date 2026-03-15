// Prueba rápida de Firebase con Node.js simple

const path = require('path');
const fs = require('fs');

console.log('🧪 PRUEBA RÁPIDA DE FIREBASE');
console.log('===========================');

// Verificar archivo de credenciales
const credFile = './app/catedra-familia-movil-firebase-adminsdk-fbsvc-4b0b148ae6.json';
const resolvedPath = path.resolve(process.cwd(), credFile);

console.log('📁 Directorio actual:', process.cwd());
console.log('📂 Buscando archivo en:', resolvedPath);

if (fs.existsSync(resolvedPath)) {
  console.log('✅ Archivo de credenciales encontrado!');
  
  try {
    const credentials = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    console.log('✅ Credentials JSON válido');
    console.log('📋 Project ID:', credentials.project_id);
    console.log('📋 Client Email:', credentials.client_email);
    
    // Probar inicialización de Firebase Admin
    try {
      const admin = require('firebase-admin');
      console.log('✅ firebase-admin module cargado');
      
      if (!admin.apps.length) {
        const app = admin.initializeApp({
          credential: admin.credential.cert(credentials)
        });
        console.log('🎉 Firebase inicializado exitosamente!');
        console.log('📋 App name:', app.name);
        
        // Probar Messaging
        const messaging = admin.messaging();
        console.log('✅ Messaging service disponible');
        console.log('🎯 FIREBASE COMPLETAMENTE FUNCIONAL');
        
      } else {
        console.log('ℹ️ Firebase ya estaba inicializado');
      }
      
    } catch (initError) {
      console.log('❌ Error inicializando Firebase:', initError.message);
    }
    
  } catch (parseError) {
    console.log('❌ Error parseando JSON:', parseError.message);
  }
  
} else {
  console.log('❌ Archivo de credenciales NO encontrado');
  
  // Listar archivos en app/
  try {
    const appFiles = fs.readdirSync('./app/');
    console.log('📋 Archivos en ./app/:', appFiles.filter(f => f.includes('firebase')));
  } catch (e) {
    console.log('⚠️ Error listando archivos:', e.message);
  }
}

console.log('\n===========================');
console.log('🏁 Prueba completada');