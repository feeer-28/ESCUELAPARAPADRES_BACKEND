// Fix urgente: Error 23502 sigue apareciendo
// Reaplicar fix para columna mensaje NOT NULL

import pkg from 'pg';
const { Client } = pkg;

console.log('🚨 APLICANDO FIX URGENTE - ERROR 23502 PERSISTENTE');

const client = new Client({
  host: 'aws-0-us-west-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.dlchjtewqwpuichmuxwr',
  password: 'ESCUELADEPADRES',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function fixUrgente() {
  try {
    await client.connect();
    console.log('📡 Conectado a PostgreSQL');
    
    // Verificar estado actual de la columna mensaje
    console.log('\n🔍 VERIFICANDO ESTADO ACTUAL DE COLUMNA mensaje:');
    const estado = await client.query(`
      SELECT is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'notificaciones_push' 
      AND column_name = 'mensaje';
    `);
    
    if (estado.rows.length > 0) {
      const isNullable = estado.rows[0].is_nullable;
      console.log(`   Estado actual: ${isNullable === 'YES' ? '✅ NULLABLE' : '❌ NOT NULL'}`);
      
      if (isNullable === 'NO') {
        console.log('🛠️ APLICANDO FIX: Haciendo columna mensaje nullable...');
        
        await client.query(`
          ALTER TABLE notificaciones_push 
          ALTER COLUMN mensaje DROP NOT NULL;
        `);
        
        console.log('✅ FIX APLICADO: columna mensaje ahora es nullable');
        
        // Verificar que se aplicó
        const verificacion = await client.query(`
          SELECT is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'notificaciones_push' 
          AND column_name = 'mensaje';
        `);
        
        const nuevoEstado = verificacion.rows[0].is_nullable;
        console.log(`🔍 VERIFICACIÓN: ${nuevoEstado === 'YES' ? '✅ ÉXITO - Ahora es nullable' : '❌ FALLÓ - Sigue siendo NOT NULL'}`);
        
      } else {
        console.log('ℹ️ La columna mensaje ya es nullable, pero el error persiste');
        console.log('🔧 Verificando si hay otros problemas...');
      }
    }
    
    // Verificar todas las columnas NOT NULL problemáticas
    console.log('\n🔍 VERIFICANDO TODAS LAS COLUMNAS NOT NULL:');
    const todasCols = await client.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'notificaciones_push'
      AND is_nullable = 'NO'
      AND column_default IS NULL;
    `);
    
    console.log('Columnas NOT NULL sin default:');
    todasCols.rows.forEach(col => {
      console.log(`   - ${col.column_name}`);
    });
    
    console.log('\n✅ FIX COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error aplicando fix:', error.message);
    console.error('Código:', error.code);
  } finally {
    await client.end();
  }
}

fixUrgente();