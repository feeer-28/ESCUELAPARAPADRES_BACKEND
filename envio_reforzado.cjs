// Script reforzado para enviar notificación con múltiples métodos
const admin = require('firebase-admin');

// Cargar credenciales Firebase
const serviceAccount = require('./app/catedra-familia-movil-firebase-adminsdk-fbsvc-4b0b148ae6.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function enviarNotificacionReforzada() {
  const timestamp = new Date().toLocaleString('es-CO');
  console.log('🚀 ENVÍO REFORZADO DE NOTIFICACIÓN');
  console.log('==================================');
  
  // Método 1: Por topic (que sabemos que funcionó antes)
  console.log('\n📡 MÉTODO 1: Enviando por TOPIC...');
  try {
    const mensajeTopic = {
      notification: {
        title: '🔥 NOTIFICACIÓN URGENTE - MÉTODO TOPIC',
        body: `Química: Laboratorio de reacciones - ${timestamp}`
      },
      data: {
        tipo: 'tarea',
        target_id: '126',
        estudiante_id: '456',
        metodo: 'topic',
        timestamp: timestamp
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#FF5722',
          sound: 'default',
          channelId: 'catedra_familia_channel'
        }
      },
      topic: 'acudiente_1234567890'
    };
    
    const responseTopic = await admin.messaging().send(mensajeTopic);
    console.log('✅ TOPIC - Enviado exitosamente:', responseTopic);
    
  } catch (error) {
    console.log('❌ TOPIC falló:', error.message);
  }

  // Método 2: Broadcast a todos los dispositivos registrados
  console.log('\n📢 MÉTODO 2: Enviando BROADCAST...');
  try {
    const mensajeBroadcast = {
      notification: {
        title: '📢 BROADCAST - Tarea de Física',
        body: `Ejercicios de mecánica cuántica - Enviado: ${timestamp}`
      },
      data: {
        tipo: 'tarea',
        target_id: '127',
        estudiante_id: '456',
        metodo: 'broadcast',
        acudiente_documento: '1234567890'
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#2196F3',
          sound: 'default',
          vibrationPattern: [0, 500, 250, 500],
          channelId: 'catedra_familia_channel'
        }
      },
      topic: 'all_acudientes'
    };
    
    const responseBroadcast = await admin.messaging().send(mensajeBroadcast);
    console.log('✅ BROADCAST - Enviado exitosamente:', responseBroadcast);
    
  } catch (error) {
    console.log('❌ BROADCAST falló:', error.message);
  }

  // Método 3: Con token específico actualizado
  console.log('\n🔑 MÉTODO 3: Probando TOKENS alternativos...');
  
  // Tokens comunes de prueba (puedes agregar más aquí)
  const tokensAlternativos = [
    // Token original
    'c6dTfPH-S12DwUKSeUZnah:APA91bEF1wsn954hn8wB-Z_g4MPcfgjhs2rcuUhP5Zy07A9yHDVxDqZ7DRwJw5nuZ2P8rrkDW2PGEplmppTk5lk4Ac76YnD1K54poVwvetbCee2g1iJSwFI',
  ];

  for (let i = 0; i < tokensAlternativos.length; i++) {
    const token = tokensAlternativos[i];
    console.log(`\n  🧪 Probando token ${i + 1}...`);
    
    try {
      const mensajeToken = {
        notification: {
          title: '🎯 DIRECTO - Inglés',
          body: `Reading comprehension - Token ${i + 1} - ${timestamp}`
        },
        data: {
          tipo: 'tarea', 
          target_id: `12${i + 8}`,
          estudiante_id: '456',
          metodo: 'token_directo'
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#4CAF50',
            sound: 'default',
            channelId: 'catedra_familia_channel'
          }
        },
        token: token
      };
      
      const responseToken = await admin.messaging().send(mensajeToken);
      console.log(`  ✅ TOKEN ${i + 1} - Enviado:`, responseToken);
      break; // Si uno funciona, salir del bucle
      
    } catch (error) {
      console.log(`  ❌ TOKEN ${i + 1} falló:`, error.errorInfo?.code || error.message);
    }
  }

  // Método 4:Condición múltiple
  console.log('\n🎯 MÉTODO 4: CONDICIÓN MÚLTIPLE...');
  try {
    const mensajeCondicion = {
      notification: {
        title: '🌟 MULTI-CONDICIÓN - Arte',
        body: `Proyecto de pintura - TODAS LAS VÍAS - ${timestamp}`
      },
      data: {
        tipo: 'tarea',
        target_id: '130',
        estudiante_id: '456',
        metodo: 'condicion_multiple'
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#9C27B0',
          sound: 'default',
          channelId: 'catedra_familia_channel'
        }
      },
      condition: "'acudiente_1234567890' in topics || 'all_acudientes' in topics"
    };
    
    const responseCondicion = await admin.messaging().send(mensajeCondicion);
    console.log('✅ CONDICIÓN MÚLTIPLE - Enviado:', responseCondicion);
    
  } catch (error) {
    console.log('❌ CONDICIÓN MÚLTIPLE falló:', error.message);
  }

  console.log('\n🎉 ENVÍO REFORZADO COMPLETADO');
  console.log('📱 Revisar el dispositivo ahora - múltiples notificaciones enviadas');
  console.log('🔔 Deberían llegar al menos 1-2 notificaciones por diferentes métodos');
  console.log(`⏰ Enviado a las: ${timestamp}`);
}

// Ejecutar
enviarNotificacionReforzada();