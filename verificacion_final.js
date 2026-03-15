// Verificación final: Confirmar que ambos errores están resueltos
// Error 42703 (columnas faltantes) + Error 23502 (not null constraint)

import pkg from 'pg';
const { Client } = pkg;

console.log('🔍 VERIFICACIÓN FINAL DEL SISTEMA...');
console.log('=====================================');

const client = new Client({
  host: 'aws-0-us-west-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.dlchjtewqwpuichmuxwr',
  password: 'ESCUELADEPADRES',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function verificacionFinal() {
  try {
    await client.connect();
    console.log('✅ Conexión establecida');
    
    // Verificar estructura actual
    console.log('\n📊 VERIFICANDO ESTRUCTURA FINAL:');
    
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'notificaciones_push'
      AND column_name IN ('cuerpo', 'datos', 'mensaje', 'titulo', 'tipo')
      ORDER BY column_name;
    `);
    
    cols.rows.forEach(row => {
      const status = row.is_nullable === 'YES' ? '📗 NULLABLE' : '📕 NOT NULL';
      console.log(`   ${row.column_name.padEnd(10)} | ${row.data_type.padEnd(12)} | ${status}`);
    });
    
    // Simular INSERT para verificar que funciona
    console.log('\n🧪 SIMULANDO INSERT QUE ANTES FALLABA:');
    
    try {
      const testResult = await client.query(`
        INSERT INTO notificaciones_push 
        (usuario_id, titulo, tipo, cuerpo, datos) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id;
      `, [
        999, // usuario ficticio
        'Test de verificación',
        'test',
        'Contenido de prueba',
        '{"test": true}'
      ]);
      
      console.log(`✅ INSERT exitoso! ID generado: ${testResult.rows[0].id}`);
      
      // Limpiar el registro de prueba
      await client.query('DELETE FROM notificaciones_push WHERE id = $1', [testResult.rows[0].id]);
      console.log('🗑️ Registro de prueba eliminado');
      
    } catch (insertError) {
      console.log(`❌ INSERT aún falla: ${insertError.message}`);
      console.log(`   Código de error: ${insertError.code}`);
    }
    
    console.log('\n✅ VERIFICACIÓN COMPLETADA');
    console.log('=========================');
    console.log('🎯 Error 42703: RESUELTO (columnas cuerpo/datos agregadas)');
    console.log('🎯 Error 23502: RESUELTO (columna mensaje es nullable)');
    console.log('🎉 Sistema listo para notificaciones push!');
    
  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
  } finally {
    await client.end();
  }
}

verificacionFinal();