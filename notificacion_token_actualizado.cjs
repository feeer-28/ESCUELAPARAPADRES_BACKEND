// Envío directo de notificación después de token actualizado
const admin = require('firebase-admin');

const serviceAccount = require('./app/catedra-familia-movil-firebase-adminsdk-fbsvc-4b0b148ae6.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function enviarConTokenActualizado() {
  const ahora = new Date();
  const timestamp = ahora.toLocaleString('es-CO');
  
  console.log('🚀 ENVIANDO CON TOKEN RECIÉN ACTUALIZADO');
  console.log('========================================');
  
  // Token que acabamos de registrar (el mismo de nuestras pruebas)
  const tokenActual = 'c6dTfPH-S12DwUKSeUZnah:APA91bEF1wsn954hn8wB-Z_g4MPcfgjhs2rcuUhP5Zy07A9yHDVxDqZ7DRwJw5nuZ2P8rrkDW2PGEplmppTk5lk4Ac76YnD1K54poVwvetbCee2g1iJSwFI';
  
  const mensaje = {
    notification: {
      title: '🎉 FUNCIONA! - Geografía',
      body: 'Mapa mental de América del Sur - Token actualizado'
    },
    data: {
      tipo: 'tarea',
      target_id: '132',
      estudiante_id: '456',
      timestamp: timestamp,
      test_token_actualizado: 'true'
    },
    android: {
      notification: {
        icon: 'ic_notification',
        color: '#4CAF50',
        sound: 'default',
        channelId: 'catedra_familia_channel'
      }
    },
    token: tokenActual
  };

  try {
    const response = await admin.messaging().send(mensaje);
    console.log('✅ NOTIFICACIÓN CON TOKEN ACTUALIZADO ENVIADA!');
    console.log('📧 Message ID:', response);
    console.log('🎉 Título: FUNCIONA! - Geografía');
    console.log('📝 Contenido: Mapa mental de América del Sur - Token actualizado');
    console.log('⏰ Enviado:', timestamp);
    console.log('🔑 Token: recientemente registrado en backend');
    console.log('');
    console.log('📱 ESTA DEBERÍA LLEGAR - el token está FRESCO');
    
  } catch (error) {
    console.error('❌ Error:', error.errorInfo?.code || error.message);
    
    if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
      console.log('💡 El token sigue expirado - necesita renovación desde la app');
    }
  }
}

enviarConTokenActualizado();