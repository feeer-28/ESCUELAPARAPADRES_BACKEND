// Test local de Firebase después del fix
// Verificar que Firebase puede inicializarse correctamente

import { initializeFirebase, getMessaging } from '../config/firebase.js';

console.log('🧪 PROBANDO CONFIGURACIÓN DE FIREBASE...');
console.log('=========================================');

console.log('📁 Directorio actual:', process.cwd());
console.log('🔧 Variables de entorno:');
console.log('   FIREBASE_SERVICE_ACCOUNT_PATH:', process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'NO DEFINIDA');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'NO DEFINIDA');

console.log('\n🔄 Intentando inicializar Firebase...');

try {
  const app = initializeFirebase();
  
  if (app) {
    console.log('✅ Firebase inicializado exitosamente!');
    console.log('📋 Info de la app:', {
      name: app.name,
      projectId: app.options.projectId || 'N/A'
    });
    
    // Probar obtener messaging
    console.log('\n🔄 Probando Firebase Messaging...');
    const messaging = getMessaging();
    
    if (messaging) {
      console.log('✅ Firebase Messaging disponible!');
      console.log('🎉 CONFIGURACIÓN COMPLETA Y FUNCIONAL');
    } else {
      console.log('❌ Firebase Messaging no disponible');
    }
    
  } else {
    console.log('❌ Firebase no se pudo inicializar');
  }
  
} catch (error) {
  console.error('💥 Error durante la prueba:', error.message);
  console.error('📋 Stack:', error.stack);
}

console.log('\n=========================================');
console.log('🏁 Prueba completada');