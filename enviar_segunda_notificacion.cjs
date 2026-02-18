// Script para enviar notificación FCM con diferentes intentos de token
const admin = require('firebase-admin');

// Cargar credenciales Firebase
const serviceAccount = require('./app/catedra-familia-movil-firebase-adminsdk-fbsvc-4b0b148ae6.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function enviarNotificacionConVariosTokens() {
  // Tokens para probar (el último es el que acabamos de registrar)
  const tokens = [
    'c6dTfPH-S12DwUKSeUZnah:APA91bEF1wsn954hn8wB-Z_g4MPcfgjhs2rcuUhP5Zy07A9yHDVxDqZ7DRwJw5nuZ2P8rrkDW2PGEplmppTk5lk4Ac76YnD1K54poVwvetbCee2g1iJSwFI',
  ];

  const timestamp = new Date().toLocaleString('es-CO');
  const mensaje = {
    notification: {
      title: '🔔 Segunda Notificación de Prueba',
      body: `Tarea de Ciencias: Experimento de laboratorio - ${timestamp}`
    },
    data: {
      tipo: 'tarea',
      target_id: '124',
      estudiante_id: '456',
      materia: 'Ciencias',
      timestamp: timestamp,
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    },
    android: {
      notification: {
        icon: 'ic_notification',
        color: '#4CAF50',
        channelId: 'catedra_familia_channel',
        sound: 'default'
      }
    }
  };

  let enviado = false;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    console.log(`\n🚀 Intento ${i + 1}: Enviando notificación...`);
    console.log(`Token: ${token.substring(0, 20)}...`);
    
    try {
      mensaje.token = token;
      const response = await admin.messaging().send(mensaje);
      
      console.log('✅ Notificación enviada exitosamente:');
      console.log('- Message ID:', response);
      console.log('- Título:', mensaje.notification.title);
      console.log('- Contenido:', mensaje.notification.body);
      console.log('- Hora:', timestamp);
      
      enviado = true;
      break;
      
    } catch (error) {
      console.error(`❌ Error con token ${i + 1}:`, error.errorInfo?.code || error.message);
      
      if (error.errorInfo?.code === 'messaging/invalid-registration-token') {
        console.log('  💡 Token inválido, probando siguiente...');
      } else if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
        console.log('  💡 Token no registrado, probando siguiente...');
      }
    }
  }

  if (!enviado) {
    console.log('\n❌ No se pudo enviar la notificación con ningún token');
    console.log('💡 El dispositivo puede estar desconectado o los tokens expirados');
  } else {
    console.log('\n📱 Verificar en el dispositivo móvil del acudiente');
    console.log('🔔 La segunda notificación debería aparecer ahora');
  }
}

// Ejecutar
enviarNotificacionConVariosTokens();