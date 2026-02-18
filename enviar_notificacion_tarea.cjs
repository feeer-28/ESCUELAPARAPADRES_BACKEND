// Script para enviar notificación FCM directa simulando tarea nueva
const admin = require('firebase-admin');

// Cargar credenciales Firebase
const serviceAccount = require('./app/catedra-familia-movil-firebase-adminsdk-fbsvc-4b0b148ae6.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function enviarNotificacionTarea() {
  const fcmToken = 'c6dTfPH-S12DwUKSeUZnah:APA91bEF1wsn954hn8wB-Z_g4MPcfgjhs2rcuUhP5Zy07A9yHDVxDqZ7DRwJw5nuZ2P8rrkDW2PGEplmppTk5lk4Ac76YnD1K54poVwvetbCee2g1iJSwFI';

  const mensaje = {
    notification: {
      title: '📚 Nueva Tarea Asignada',
      body: 'Matemáticas: Ejercicios de álgebra lineal - Entrega: 19/02/2026'
    },
    data: {
      tipo: 'tarea',
      target_id: '123',
      estudiante_id: '456',
      materia: 'Matemáticas',
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    },
    android: {
      notification: {
        icon: 'ic_notification',
        color: '#FF5722',
        channelId: 'catedra_familia_channel'
      }
    },
    token: fcmToken
  };

  try {
    console.log('🚀 Enviando notificación FCM...');
    const response = await admin.messaging().send(mensaje);
    
    console.log('✅ Notificación enviada exitosamente:');
    console.log('- Message ID:', response);
    console.log('- Título:', mensaje.notification.title);
    console.log('- Contenido:', mensaje.notification.body);
    console.log('- Tipo:', mensaje.data.tipo);
    console.log('- Target ID:', mensaje.data.target_id);
    console.log('\n📱 Verificar en el dispositivo móvil del acudiente');
    console.log('🔔 La notificación debería aparecer inmediatamente');
    
  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
  }
}

// Ejecutar
enviarNotificacionTarea();