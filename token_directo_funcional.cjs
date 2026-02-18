// Notificación con TOKEN DIRECTO que sabemos que funciona
const admin = require('firebase-admin');

const serviceAccount = require('./app/catedra-familia-movil-firebase-adminsdk-fbsvc-4b0b148ae6.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function notificacionTokenDirecto() {
  const ahora = new Date();
  const timestamp = ahora.toLocaleString('es-CO');
  
  // Este es el token que funcionó antes
  const tokenDirecto = 'c6dTfPH-S12DwUKSeUZnah:APA91bEF1wsn954hn8wB-Z_g4MPcfgjhs2rcuUhP5Zy07A9yHDVxDqZ7DRwJw5nuZ2P8rrkDW2PGEplmppTk5lk4Ac76YnD1K54poVwvetbCee2g1iJSwFI';
  
  const mensaje = {
    notification: {
      title: '📚 Historia - Nueva Tarea',
      body: 'Ensayo sobre la Segunda Guerra Mundial - Entrega: 20/02/2026'
    },
    data: {
      tipo: 'tarea',
      target_id: '131',
      estudiante_id: '456',
      timestamp: timestamp
    },
    android: {
      notification: {
        icon: 'ic_notification',
        color: '#FF5722',
        channelId: 'catedra_familia_channel'
      }
    },
    token: tokenDirecto
  };

  try {
    const response = await admin.messaging().send(mensaje);
    console.log('✅ Notificación TOKEN DIRECTO enviada:', response);
    console.log('📚 Título: Historia - Nueva Tarea');
    console.log('📝 Contenido: Ensayo sobre la Segunda Guerra Mundial');
    console.log('⏰ Enviado:', timestamp);
    console.log('🎯 Método: TOKEN DIRECTO (el que funcionó antes)');
  } catch (error) {
    console.error('❌ Error con token directo:', error.errorInfo?.code || error.message);
  }
}

notificacionTokenDirecto();