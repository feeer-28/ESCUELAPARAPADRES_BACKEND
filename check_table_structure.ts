import db from '@adonisjs/lucid/services/db'
import { defineConfig } from '@adonisjs/lucid'

async function checkTableStructure() {
  try {
    // Consultar estructura de la tabla funcionarios
    const columns = await db.rawQuery(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'funcionarios' 
      ORDER BY ordinal_position;
    `)
    
    console.log('\n📋 Estructura de la tabla FUNCIONARIOS:\n')
    console.log(columns.rows)
    console.log('\n')
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkTableStructure()
