// Fix directo para agregar columnas faltantes usando Node.js
// Resuelve error 42703: column "cuerpo" does not exist

import pkg from 'pg';
const { Client } = pkg;

console.log('🔧 Iniciando fix de base de datos...');

// Configuración de conexión
const client = new Client({
  host: 'aws-0-us-west-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.dlchjtewqwpuichmuxwr',
  password: 'ESCUELADEPADRES',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function aplicarFix() {
  try {
    console.log('📡 Conectando a PostgreSQL...');
    await client.connect();
    
    console.log('⚡ Ejecutando comandos ALTER TABLE...');
    
    // Agregar columnas si no existen
    await client.query(`
      ALTER TABLE notificaciones_push 
      ADD COLUMN IF NOT EXISTS cuerpo TEXT;
    `);
    
    await client.query(`
      ALTER TABLE notificaciones_push 
      ADD COLUMN IF NOT EXISTS datos JSONB;
    `);
    
    // Verificar que se agregaron
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notificaciones_push' 
      AND column_name IN ('cuerpo', 'datos')
      ORDER BY column_name;
    `);
    
    console.log('✅ FIX APLICADO EXITOSAMENTE!');
    console.log('📊 Columnas en notificaciones_push:');
    result.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('🎉 El error 42703 ahora está resuelto!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📋 Detalles técnicos:', error.code);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

aplicarFix();