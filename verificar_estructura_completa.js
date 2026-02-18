// Verificar estructura completa de notificaciones_push
// Identificar columnas NOT NULL que están causando problemas

import pkg from 'pg';
const { Client } = pkg;

console.log('🔍 ANALIZANDO ESTRUCTURA DE notificaciones_push...');

const client = new Client({
  host: 'aws-0-us-west-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.dlchjtewqwpuichmuxwr',
  password: 'ESCUELADEPADRES',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function verificarEstructura() {
  try {
    await client.connect();
    
    console.log('📊 ESTRUCTURA COMPLETA DE notificaciones_push:');
    console.log('=============================================');
    
    // Obtener todas las columnas con sus restricciones
    const result = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'notificaciones_push'
      ORDER BY ordinal_position;
    `);
    
    result.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? '✅ NULL' : '❌ NOT NULL';
      const defaultVal = row.column_default ? `(default: ${row.column_default})` : '';
      console.log(`   ${row.column_name.padEnd(15)} | ${row.data_type.padEnd(12)} | ${nullable} ${defaultVal}`);
    });
    
    console.log('\n🔍 IDENTIFICANDO PROBLEMAS:');
    
    // Verificar columnas NOT NULL que podrían causar problemas
    const notNullColumns = result.rows.filter(row => 
      row.is_nullable === 'NO' && 
      !row.column_default
    );
    
    if (notNullColumns.length > 0) {
      console.log('⚠️ COLUMNAS NOT NULL SIN DEFAULT:');
      notNullColumns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    }
    
    // Verificar si existe columna mensaje
    const mensajeCol = result.rows.find(row => row.column_name === 'mensaje');
    if (mensajeCol) {
      console.log(`\n🎯 COLUMNA MENSAJE ENCONTRADA:`);
      console.log(`   Tipo: ${mensajeCol.data_type}`);
      console.log(`   Nullable: ${mensajeCol.is_nullable}`);
      console.log(`   Default: ${mensajeCol.column_default || 'None'}`);
      
      if (mensajeCol.is_nullable === 'NO' && !mensajeCol.column_default) {
        console.log('   ❌ PROBLEMA: mensaje es NOT NULL sin default value');
        console.log('   💡 SOLUCIÓN NECESARIA: Agregar default o hacer nullable');
      }
    }
    
    console.log('\n🔧 GENERANDO FIX...');
    
    // Aplicar fix si es necesario
    if (mensajeCol && mensajeCol.is_nullable === 'NO' && !mensajeCol.column_default) {
      console.log('🛠️ Aplicando fix: hacer columna mensaje nullable...');
      
      await client.query(`
        ALTER TABLE notificaciones_push 
        ALTER COLUMN mensaje DROP NOT NULL;
      `);
      
      console.log('✅ Fix aplicado: columna mensaje ahora es nullable');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

verificarEstructura();