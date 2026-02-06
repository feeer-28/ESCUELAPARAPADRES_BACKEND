import fs from 'fs'
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

async function executeSQLFile() {
  console.log('🔍 Ejecutando script SQL en Supabase...')
  
  const client = new Client(dbConfig)
  
  try {
    console.log('🚀 Conectando a la base de datos...')
    await client.connect()
    console.log('✅ Conexión exitosa!')
    
    // Leer el archivo SQL
    const sqlContent = fs.readFileSync('setup_database.sql', 'utf8')
    console.log('📄 Archivo SQL leído')
    
    // Separar el contenido en sentencias individuales
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📊 Ejecutando ${statements.length} sentencias SQL...`)
    
    // Ejecutar cada sentencia
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          await client.query(statement)
          console.log(`✅ Sentencia ${i + 1}/${statements.length} ejecutada`)
        } catch (error) {
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('duplicate key') ||
              error.message.includes('check constraint')) {
            console.log(`⚠️  Sentencia ${i + 1}/${statements.length} omitida (ya existe): ${error.message.split('\n')[0]}`)
          } else {
            console.error(`❌ Error en sentencia ${i + 1}:`, error.message)
            // Continuar con las demás sentencias
          }
        }
      }
    }
    
    console.log('🎉 Script SQL ejecutado completamente!')
    
    // Verificar tablas creadas
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    console.log('📋 Tablas en la base de datos:', tables.rows.length)
    console.log('   Tablas:', tables.rows.map(row => row.table_name).join(', '))
    
    // Verificar roles
    try {
      const roles = await client.query('SELECT COUNT(*) as count FROM roles')
      console.log('👥 Tabla roles con', roles.rows[0].count, 'registros')
    } catch (error) {
      console.log('⚠️  No se pudo verificar roles:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  } finally {
    try {
      await client.end()
      console.log('🔌 Conexión cerrada')
    } catch (error) {
      console.log('⚠️  Error al cerrar conexión:', error.message)
    }
  }
}

// Ejecutar script
executeSQLFile().catch(console.error)
