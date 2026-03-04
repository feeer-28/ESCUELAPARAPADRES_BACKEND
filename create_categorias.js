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

async function createCategorias() {
  console.log('🔍 Creando categorías de tareas...')
  
  const client = new Client(dbConfig)
  
  try {
    console.log('🚀 Conectando a la base de datos...')
    await client.connect()
    console.log('✅ Conexión exitosa!')
    
    // Categorías a crear
    const categorias = [
      {
        nombre: 'Valores y Convivencia',
        descripcion: 'Actividades relacionadas con valores familiares y convivencia',
        color: '#4CAF50',
        icono: 'heart'
      },
      {
        nombre: 'Desarrollo Personal',
        descripcion: 'Actividades de crecimiento personal y autoestima',
        color: '#2196F3',
        icono: 'person'
      },
      {
        nombre: 'Comunicación Familiar',
        descripcion: 'Talleres de comunicación entre padres e hijos',
        color: '#FF9800',
        icono: 'chat'
      },
      {
        nombre: 'Resolución de Conflictos',
        descripcion: 'Estrategias para resolver conflictos familiares',
        color: '#F44336',
        icono: 'handshake'
      },
      {
        nombre: 'Acompañamiento Académico',
        descripcion: 'Apoyo en el proceso educativo de los hijos',
        color: '#9C27B0',
        icono: 'school'
      }
    ]
    
    console.log(`📊 Creando ${categorias.length} categorías...`)
    
    for (let i = 0; i < categorias.length; i++) {
      const categoria = categorias[i]
      
      try {
        const result = await client.query(`
          INSERT INTO categorias (nombre, descripcion, color, icono)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (nombre) DO UPDATE SET
            descripcion = EXCLUDED.descripcion,
            color = EXCLUDED.color,
            icono = EXCLUDED.icono
          RETURNING id, nombre
        `, [categoria.nombre, categoria.descripcion, categoria.color, categoria.icono])
        
        console.log(`✅ Categoría ${i + 1}/${categorias.length} creada/actualizada:`, result.rows[0])
        
      } catch (error) {
        console.error(`❌ Error creando categoría "${categoria.nombre}":`, error.message)
      }
    }
    
    // Verificar categorías creadas
    const verifyResult = await client.query('SELECT id, nombre, descripcion FROM categorias ORDER BY id')
    console.log('📋 Categorías en la base de datos:', verifyResult.rows.length)
    verifyResult.rows.forEach(cat => {
      console.log(`   ${cat.id}. ${cat.nombre} - ${cat.descripcion}`)
    })
    
    console.log('🎉 Categorías creadas exitosamente!')
    
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
createCategorias().catch(console.error)
