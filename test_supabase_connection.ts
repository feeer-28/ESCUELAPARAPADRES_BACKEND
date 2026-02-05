import { Database } from '@adonisjs/lucid/database'
import env from '#start/env'

async function testSupabaseConnection() {
  console.log('🔍 Probando conexión con Supabase...')
  console.log('📍 Host:', env.get('DB_HOST'))
  console.log('🔌 Port:', env.get('DB_PORT'))
  console.log('👤 User:', env.get('DB_USER'))
  console.log('💾 Database:', env.get('DB_DATABASE'))
  
  try {
    // Crear instancia de base de datos
    const db = new Database({
      connection: 'postgres',
      connections: {
        postgres: {
          client: 'pg',
          connection: {
            host: env.get('DB_HOST'),
            port: env.get('DB_PORT'),
            user: env.get('DB_USER'),
            password: env.get('DB_PASSWORD'),
            database: env.get('DB_DATABASE'),
          },
        },
      },
    })

    console.log('🚀 Intentando conectar...')
    
    // Probar conexión simple
    const result = await db.connection().raw('SELECT 1 as test_connection')
    console.log('✅ Conexión exitosa!')
    console.log('📊 Resultado:', result.rows)
    
    // Probar consulta a una tabla existente
    try {
      const tables = await db.connection().raw(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 10
      `)
      console.log('📋 Tablas encontradas:', tables.rows.map((row: any) => row.table_name))
    } catch (error) {
      console.log('⚠️  No se pudieron listar tablas (puede ser normal si la BD está vacía)')
    }
    
    // Probar versión de PostgreSQL
    const version = await db.connection().raw('SELECT version()')
    console.log('🔧 Versión PostgreSQL:', version.rows[0].version)
    
    // Cerrar conexión
    await db.manager.closeAll()
    console.log('🔌 Conexión cerrada')
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message)
    console.error('📝 Detalles del error:', error)
    
    if (error.message.includes('password')) {
      console.log('🔑 Posible problema con la contraseña')
    }
    if (error.message.includes('host')) {
      console.log('🌐 Posible problema con el host')
    }
    if (error.message.includes('timeout')) {
      console.log('⏱️  Posible problema de timeout o red')
    }
  }
}

// Ejecutar prueba
testSupabaseConnection().catch(console.error)
