import pkg from 'pg'
import { config } from 'dotenv'

const { Client } = pkg

// Cargar variables de entorno
config()

// Configuración de conexión a Supabase
const dbConfig = {
  host: 'aws-0-us-west-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.dlchjtewqwpuichmuxwr',
  password: process.env.DB_PASSWORD || 'ESCUELADEPADRES',
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
}

async function testConnection() {
  console.log('🔍 Probando conexión con Supabase...')
  console.log('📍 Host:', dbConfig.host)
  console.log('🔌 Port:', dbConfig.port)
  console.log('👤 User:', dbConfig.user)
  console.log('💾 Database:', dbConfig.database)
  console.log('🔑 Password:', dbConfig.password ? '***Configurado***' : '***NO CONFIGURADO***')
  
  const client = new Client(dbConfig)
  
  try {
    console.log('🚀 Intentando conectar...')
    await client.connect()
    console.log('✅ Conexión exitosa!')
    
    // Probar consulta simple
    const result = await client.query('SELECT NOW() as current_time, version() as version')
    console.log('📊 Fecha actual:', result.rows[0].current_time)
    console.log('🔧 Versión PostgreSQL:', result.rows[0].version.split(',')[0])
    
    // Listar tablas
    try {
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `)
      console.log('📋 Tablas encontradas:', tables.rows.length)
      if (tables.rows.length > 0) {
        console.log('   Tablas:', tables.rows.map(row => row.table_name).join(', '))
      }
    } catch (error) {
      console.log('⚠️  No se pudieron listar tablas:', error.message)
    }
    
    // Probar consulta a roles si existe
    try {
      const roles = await client.query('SELECT COUNT(*) as count FROM roles')
      console.log('👥 Tabla roles encontrada con', roles.rows[0].count, 'registros')
    } catch (error) {
      console.log('⚠️  Tabla roles no encontrada (puede ser normal)')
    }
    
  } catch (error) {
    console.error('❌ Error de conexión:')
    console.error('   Mensaje:', error.message)
    console.error('   Código:', error.code)
    
    // Análisis específico de errores
    if (error.code === 'ECONNREFUSED') {
      console.log('🔧 Solución: Verificar que el host y puerto son correctos')
    } else if (error.code === '28P01') {
      console.log('🔑 Solución: Verificar la contraseña del usuario')
    } else if (error.code === '28000') {
      console.log('👤 Solución: Verificar el nombre de usuario')
    } else if (error.code === '3D000') {
      console.log('💾 Solución: Verificar el nombre de la base de datos')
    } else if (error.code === '08006') {
      console.log('🌐 Solución: Problema de conexión SSL o red')
    }
    
  } finally {
    try {
      await client.end()
      console.log('🔌 Conexión cerrada')
    } catch (error) {
      console.log('⚠️  Error al cerrar conexión:', error.message)
    }
  }
}

// Ejecutar prueba
testConnection()
