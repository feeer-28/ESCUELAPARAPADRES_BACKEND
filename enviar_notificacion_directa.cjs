const admin = require('firebase-admin');
const path = require('path');

// --- CONFIGURACIÓN ---
// Token del dispositivo al que se enviará la notificación.
// Reemplazar con el token real del dispositivo de prueba.
const registrationToken = 'cIx9CFkiQryfdcH2k1zzQ3:APA91bFAksBJIFbtAParM8Kyz6eSPPTsJBJn9I33Api5BE6t6rcRJ06ZqCM_1KmOq2vd8UReDiSf-1uEWAUqMp3Hflh9QapxBeLHs0hpHiRUaAafD6v0AaY';

// Título y cuerpo de la notificación
const title = 'Prueba de Notificación';
const body = '¡Si ves esto, la notificación desde el backend funciona!';
// --- FIN DE LA CONFIGURACIÓN ---

console.log('--- Iniciando prueba de envío de notificación directa ---');

// Cargar las credenciales de Firebase desde la ruta definida en las variables de entorno
// La ruta es la misma que usa la aplicación principal en el Dockerfile.
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '/app/app/catedra-familia-movil-firebase-adminsdk-fbsvc-4b0b148ae6.json';

try {
    const serviceAccount = require(serviceAccountPath);
    console.log('✅ Credenciales de Firebase cargadas exitosamente.');

    // Inicializar Firebase Admin SDK
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK inicializado.');

    // Definir el contenido del mensaje
    const message = {
        notification: {
            title: title,
            body: body,
        },
        token: registrationToken
    };

    // Enviar el mensaje
    console.log(`🚀 Enviando notificación al token: ...${registrationToken.slice(-10)}`);
    admin.messaging().send(message)
        .then((response) => {
            console.log('🎉 ¡Notificación enviada con éxito! ✅');
            console.log('   - ID del mensaje:', response);
            console.log('\n--- Prueba finalizada ---');
        })
        .catch((error) => {
            console.error('❌ Error al enviar la notificación:');
            console.error('   - Código:', error.code);
            console.error('   - Mensaje:', error.message);
            console.error('\nPosibles causas:');
            console.error('   1. El token del dispositivo es inválido o ha expirado.');
            console.error('   2. Problemas de conexión con los servidores de Firebase.');
            console.error('   3. La configuración de credenciales de Firebase es incorrecta.');
            console.log('\n--- Prueba finalizada con errores ---');
        });

} catch (error) {
    console.error('❌ Error Crítico: No se pudieron cargar las credenciales de Firebase.');
    console.error('   - Ruta buscada:', serviceAccountPath);
    console.error('   - Mensaje:', error.message);
    console.error('\nAsegúrate de que la ruta en FIREBASE_SERVICE_ACCOUNT_PATH es correcta dentro del contenedor.');
    console.log('\n--- Prueba abortada ---');
}