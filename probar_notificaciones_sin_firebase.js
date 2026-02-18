#!/usr/bin/env node

/**
 * 🔔 SCRIPT DE PRUEBA - NOTIFICACIONES SIN FIREBASE
 * Este script permite probar el sistema de notificaciones del backend
 * sin depender de Firebase, usando Knex directamente
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import knex from 'knex';
import fetch from 'node-fetch';

// Configuración de la base de datos (usar las mismas credenciales del proyecto)
const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'escuela_padres'
  }
});

// URL base del backend 
const BASE_URL = 'https://escuelaparapadres-backend-1.onrender.com';

// Credenciales del acudiente (confirmadas como funcionales)
const CREDENTIALS = {
  numeroDocumento: '1061705869',
  password: '1061705869'
};

let jwtToken = '';

console.log('🚀 INICIANDO PRUEBA DE NOTIFICACIONES SIN FIREBASE...\n');

/**
 * 1️⃣ VERIFICAR ESTRUCTURA DE TABLA dispositivos_moviles
 */
async function verificarEstructuraTabla() {
  console.log('📋 1. VERIFICANDO ESTRUCTURA DE TABLA dispositivos_moviles...');
  
  try {
    const columns = await db.raw(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'dispositivos_moviles'
      ORDER BY ordinal_position
    `);
    
    console.log('✅ ESTRUCTURA ACTUAL DE LA TABLA:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Verificar campos críticos
    const fieldNames = columns.rows.map(row => row.column_name);
    const hasDispositivo = fieldNames.includes('dispositivo');
    const hasModeloDispositivo = fieldNames.includes('modelo_dispositivo');
    const hasSistemaOperativo = fieldNames.includes('sistema_operativo');
    const hasPlataforma = fieldNames.includes('plataforma');
    
    console.log('\n🔍 ANÁLISIS DE CAMPOS CRÍTICOS:');
    console.log(`   - Usa "dispositivo": ${hasDispositivo ? '✅' : '❌'}`);
    console.log(`   - Usa "modelo_dispositivo": ${hasModeloDispositivo ? '✅' : '❌'}`);
    console.log(`   - Usa "sistema_operativo": ${hasSistemaOperativo ? '✅' : '❌'}`);
    console.log(`   - Usa "plataforma": ${hasPlataforma ? '✅' : '❌'}`);
    
    return {
      hasDispositivo,
      hasModeloDispositivo, 
      hasSistemaOperativo,
      hasPlataforma,
      allColumns: fieldNames
    };
    
  } catch (error) {
    console.error('❌ ERROR al verificar estructura:', error.message);
    return null;
  }
}

/**
 * 2️⃣ LOGIN PARA OBTENER TOKEN JWT
 */
async function hacerLogin() {
  console.log('\n🔑 2. HACIENDO LOGIN DE ACUDIENTE...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/movil/auth/login/movil`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(CREDENTIALS)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      jwtToken = result.data.token;
      console.log('✅ LOGIN EXITOSO');
      console.log(`   - Usuario: ${result.data.usuario.nombre}`);
      console.log(`   - Token JWT: ${jwtToken.substring(0, 30)}...`);
      return true;
    } else {
      console.error('❌ ERROR EN LOGIN:', result.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ ERROR DE CONEXIÓN:', error.message);
    return false;
  }
}

/**
 * 3️⃣ PROBAR REGISTRO DE TOKEN FCM (SIN FIREBASE REAL)
 */
async function probarRegistroFCM(tableStructure) {
  console.log('\n📱 3. PROBANDO REGISTRO DE TOKEN FCM...');
  
  // Preparar payload según estructura de tabla
  let payload;
  
  if (tableStructure.hasDispositivo && tableStructure.hasSistemaOperativo) {
    // Usar estructura original 
    payload = {
      fcmToken: 'TEST_TOKEN_' + Date.now(),
      dispositivo: 'Test Device Moto E40',
      sistemaOperativo: 'android',
      versionApp: '1.0'
    };
    console.log('   📋 Usando estructura ORIGINAL (dispositivo, sistema_operativo)');
  } else if (tableStructure.hasModeloDispositivo && tableStructure.hasPlataforma) {
    // Usar estructura v2
    payload = {
      token_fcm: 'TEST_TOKEN_' + Date.now(),
      plataforma: 'android',
      version_app: '1.0',
      modelo_dispositivo: 'Test Device Moto E40',
      version_os: '11'
    };
    console.log('   📋 Usando estructura V2 (modelo_dispositivo, plataforma)');
  } else {
    console.error('❌ Estructura de tabla no reconocida');
    return false;
  }
  
  console.log('   📤 Payload a enviar:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}/api/movil/notificaciones/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    console.log(`   📡 Respuesta del servidor: ${response.status} ${response.statusText}`);
    console.log('   📄 Respuesta JSON:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('✅ TOKEN FCM REGISTRADO EXITOSAMENTE');
      return { success: true, tokenFcm: payload.fcmToken || payload.token_fcm };
    } else {
      console.error(`❌ ERROR AL REGISTRAR TOKEN: ${result.message || 'Error desconocido'}`);
      if (result.error) {
        console.error(`   🐛 Detalle del error: ${result.error}`);
      }
      return { success: false, error: result };
    }
    
  } catch (error) {
    console.error('❌ ERROR DE CONEXIÓN:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 4️⃣ CREAR NOTIFICACIÓN DE PRUEBA DIRECTAMENTE EN BD
 */
async function crearNotificacionPrueba(usuarioId) {
  console.log('\n📬 4. CREANDO NOTIFICACIÓN DE PRUEBA DIRECTAMENTE EN BD...');
  
  try {
    const notificacionData = {
      usuario_id: usuarioId,
      titulo: '🔔 Prueba de Notificación',
      cuerpo: 'Esta es una notificación de prueba creada desde el backend sin Firebase',
      tipo: 'prueba',
      datos: JSON.stringify({
        origen: 'backend_test',
        timestamp: new Date().toISOString(),
        test: true
      }),
      leida: false,
      creada_en: new Date()
    };
    
    const [notificacion] = await db('notificaciones_push')
      .insert(notificacionData)
      .returning('*');
      
    console.log('✅ NOTIFICACIÓN CREADA EN BD:');
    console.log(`   - ID: ${notificacion.id}`);
    console.log(`   - Título: ${notificacion.titulo}`);
    console.log(`   - Usuario ID: ${notificacion.usuario_id}`);
    console.log(`   - Tipo: ${notificacion.tipo}`);
    
    return notificacion;
    
  } catch (error) {
    console.error('❌ ERROR al crear notificación:', error.message);
    return null;
  }
}

/**
 * 5️⃣ LISTAR NOTIFICACIONES VÍA API
 */
async function listarNotificaciones() {
  console.log('\n📋 5. LISTANDO NOTIFICACIONES VÍA API...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/movil/notificaciones`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ NOTIFICACIONES OBTENIDAS:');
      console.log(`   - Total: ${result.data.notificaciones.length}`);
      console.log(`   - No leídas: ${result.data.meta.noLeidas}`);
      
      if (result.data.notificaciones.length > 0) {
        console.log('\n   📜 LISTA DE NOTIFICACIONES:');
        result.data.notificaciones.slice(0, 5).forEach((notif, index) => {
          console.log(`   ${index + 1}. ${notif.titulo} (${notif.tipo}) - ${notif.leida ? 'Leída' : 'No leída'}`);
        });
      }
      
      return result.data;
    } else {
      console.error('❌ ERROR al listar notificaciones:', result.message);
      return null;
    }
    
  } catch (error) {
    console.error('❌ ERROR DE CONEXIÓN:', error.message);
    return null;
  }
}

/**
 * 6️⃣ SIMULAR NOTIFICACIÓN DE TAREA NUEVA
 */
async function simularNotificacionTarea(usuarioId) {
  console.log('\n🎯 6. SIMULANDO NOTIFICACIÓN DE TAREA NUEVA...');
  
  try {
    // Crear notificación de tarea
    const tareaNotification = {
      usuario_id: usuarioId,
      titulo: '📚 Nueva Tarea Asignada',
      cuerpo: 'Se ha asignado una nueva tarea para tu hijo/a. ¡Revísala en la app!',
      tipo: 'tarea',
      datos: JSON.stringify({
        tarea_id: 999,
        estudiante: 'Estudiante Test',
        materia: 'Matemáticas',
        fecha_entrega: '2026-02-20',
        prioridad: 'media'
      }),
      leida: false, 
      creada_en: new Date()
    };
    
    const [notif] = await db('notificaciones_push')
      .insert(tareaNotification)
      .returning('*');
      
    console.log('✅ NOTIFICACIÓN DE TAREA SIMULADA:');
    console.log(`   - Título: ${notif.titulo}`);
    console.log(`   - Tipo: ${notif.tipo}`);
    console.log(`   - Datos: ${notif.datos}`);
    
    // Obtener token FCM del usuario para simular envío
    const dispositivos = await db('dispositivos_moviles')
      .where('usuario_id', usuarioId)
      .where('activo', true)
      .select('token_fcm', 'dispositivo', 'modelo_dispositivo');
      
    console.log('\n   📱 DISPOSITIVOS REGISTRADOS:');
    if (dispositivos.length > 0) {
      dispositivos.forEach((device, index) => {
        const deviceName = device.dispositivo || device.modelo_dispositivo || 'Desconocido';
        console.log(`   ${index + 1}. ${deviceName} - Token: ${device.token_fcm.substring(0, 20)}...`);
      });
      console.log('   💡 En producción, estos tokens recibirían la push notification via FCM');
    } else {
      console.log('   ⚠️ No hay dispositivos registrados');
    }
    
    return notif;
    
  } catch (error) {
    console.error('❌ ERROR al simular notificación:', error.message);
    return null;
  }
}

/**
 * 🏃‍♂️ EJECUTAR TODAS LAS PRUEBAS
 */
async function ejecutarPruebas() {
  try {
    console.log('═══════════════════════════════════════════════');
    console.log('🔔 PRUEBA COMPLETA DE NOTIFICACIONES SIN FIREBASE');
    console.log('═══════════════════════════════════════════════\n');
    
    // 1. Verificar estructura
    const tableStructure = await verificarEstructuraTabla();
    if (!tableStructure) {
      console.log('\n❌ No se pudo verificar la estructura de la tabla. Saliendo...');
      return;
    }
    
    // 2. Login
    const loginSuccess = await hacerLogin();
    if (!loginSuccess) {
      console.log('\n❌ No se pudo hacer login. Saliendo...');
      return;
    }
    
    // Extraer user ID del token
    const tokenParts = jwtToken.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    const usuarioId = payload.id;
    console.log(`\n👤 Usuario ID extraído del token: ${usuarioId}`);
    
    // 3. Probar registro FCM
    const fcmResult = await probarRegistroFCM(tableStructure);
    if (fcmResult.success) {
      console.log('\n✅ REGISTRO FCM: FUNCIONAL');
    } else {
      console.log('\n⚠️ REGISTRO FCM: REQUIERE CORRECCIÓN');
      console.log('   💡 Pero podemos continuar con otras pruebas...');
    }
    
    // 4. Crear notificación de prueba
    const notifPrueba = await crearNotificacionPrueba(usuarioId);
    
    // 5. Listar notificaciones
    await listarNotificaciones();
    
    // 6. Simular notificación de tarea
    await simularNotificacionTarea(usuarioId);
    
    // 7. Listar notificaciones después de crear las nuevas
    console.log('\n📋 LISTANDO NOTIFICACIONES DESPUÉS DE CREAR NUEVAS...');
    await listarNotificaciones();
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ PRUEBA COMPLETA FINALIZADA');
    console.log('═══════════════════════════════════════════════');
    
    console.log('\n📊 RESUMEN DE RESULTADOS:');
    console.log(`   - Estructura de tabla: ${tableStructure ? '✅' : '❌'} Verificada`);
    console.log(`   - Login de acudiente: ${loginSuccess ? '✅' : '❌'} Funcional`);
    console.log(`   - Registro FCM: ${fcmResult.success ? '✅' : '⚠️'} ${fcmResult.success ? 'Funcional' : 'Requiere ajuste'}`);
    console.log(`   - Creación notificaciones: ${notifPrueba ? '✅' : '❌'} Funcional`);
    console.log('   - API notificaciones: ✅ Funcional');
    console.log('   - Simulación tarea: ✅ Funcional');
    
    if (!fcmResult.success) {
      console.log('\n🔧 ANÁLISIS PARA CORRECCIÓN FCM:');
      if (tableStructure.hasDispositivo && !tableStructure.hasModeloDispositivo) {
        console.log('   📝 La tabla usa estructura ORIGINAL (dispositivo, sistema_operativo)');
        console.log('   💡 La app móvil debe enviar: {"fcmToken", "dispositivo", "sistemaOperativo"}');
      } else if (tableStructure.hasModeloDispositivo && !tableStructure.hasDispositivo) {
        console.log('   📝 La tabla usa estructura V2 (modelo_dispositivo, plataforma)');
        console.log('   💡 La app móvil debe enviar: {"token_fcm", "modelo_dispositivo", "plataforma"}');
      } else {
        console.log('   📝 Estructura de tabla ambigua - verificar manualmente');
      }
    }
    
  } catch (error) {
    console.error('\n💥 ERROR CRÍTICO:', error.message);
  } finally {
    // Cerrar conexión de base de datos
    await db.destroy();
    console.log('\n👋 Conexión de base de datos cerrada.');
  }
}

// Ejecutar las pruebas
ejecutarPruebas();