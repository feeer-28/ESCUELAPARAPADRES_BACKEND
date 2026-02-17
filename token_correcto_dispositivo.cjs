// Notificación con TOKEN FCM CORRECTO del dispositivo
const admin = require('firebase-admin');

const serviceAccount = require('./app/catedra-familia-movil-firebase-adminsdk-fbsvc-4b0b148ae6.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function enviarConTokenCorrecto() {
  const ahora = new Date();
  const timestamp = ahora.toLocaleString('es-CO');
  
  console.log('🎯 USANDO TOKEN FCM CORRECTO DEL DISPOSITIVO');
  console.log('============================================');
  
  // TOKEN FCM REAL DEL DISPOSITIVO (el que acabas de proporcionar)
  const tokenCorrecto = 'cOyi8LtzTrayHhfOx1IB1J:APA91bGPp3ZReRJpM5nvuPeP-LH__m4cOJAZdOI9cKUiJNoGkediJCTgA-g_JZUaqEQ9X6pTtDYCj45BW261NAx_pMfn5dxLMkDnngwkDliy7zP1JaAjES4';
  
  const mensaje = {
    notification: {
      title: '✅ CON TOKEN CORRECTO - Biología',
      body: `Sistema circulatorio humano - Enviado: ${timestamp}`
    },
    data: {
      tipo: 'tarea',
      target_id: '133',
      estudiante_id: '456',
      timestamp: timestamp,
      token_correcto: 'true'
    },
    android: {
      notification: {
        icon: 'ic_notification',
        color: '#4CAF50',
        sound: 'default',
        channelId: 'catedra_familia_channel'
      }
    },
    token: tokenCorrecto
  };

  try {
    const response = await admin.messaging().send(mensaje);
    console.log('🎉 NOTIFICACIÓN ENVIADA CON TOKEN CORRECTO!');
    console.log('📧 Message ID:', response);
    console.log('✅ Título: CON TOKEN CORRECTO - Biología');  
    console.log('📝 Contenido: Sistema circulatorio humano');
    console.log('⏰ Enviado:', timestamp);
    console.log('🔑 Token: cOyi8LtzTrayHhfOx1IB1J...');
    console.log('');
    console.log('📱 ESTA DEBE LLEGAR - usando el token real del dispositivo!');
    
  } catch (error) {
    console.error('❌ Error con token correcto:', error.errorInfo?.code || error.message);
  }
}

enviarConTokenCorrecto();