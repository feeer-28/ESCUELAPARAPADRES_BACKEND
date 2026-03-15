// Notificación simple para pruebas
const admin = require('firebase-admin');

const serviceAccount = require('./app/catedra-familia-movil-firebase-adminsdk-fbsvc-4b0b148ae6.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function notificacionSimple() {
  const ahora = new Date();
  const timestamp = ahora.toLocaleString('es-CO');
  
  const mensaje = {
    notification: {
      title: 'Notificación de Prueba',
      body: 'Esta es una notificación simple.'
    },
    data: {
      tipo: 'prueba',
      timestamp: timestamp
    },
    topic: 'acudiente_1234567890'
  };

  try {
    const response = await admin.messaging().send(mensaje);
    console.log('✅ Notificación simple enviada:', response);
    console.log('Título: Notificación de Prueba');
    console.log('Contenido: Esta es una notificación simple.');
    console.log('⏰ Enviado:', timestamp);
  } catch (error) {
    console.error('❌ Error enviando notificación simple:', error);
  }
}

notificacionSimple();