// Fix definitivo - Múltiples aproximaciones para resolver error 23502

import pkg from 'pg';
const { Client } = pkg;

console.log('🚨 FIX DEFINITIVO - ATAQUE MÚLTIPLE AL ERROR 23502');

const client = new Client({
  host: 'aws-0-us-west-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.dlchjtewqwpuichmuxwr',
  password: 'ESCUELADEPADRES',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function fixDefinitivo() {
  try {
    await client.connect();
    console.log('📡 Conectado');
    
    console.log('\n🔧 FIX 1: Verificar y agregar DEFAULT a mensaje');
    try {
      await client.query(`
        ALTER TABLE notificaciones_push 
        ALTER COLUMN mensaje SET DEFAULT '';
      `);
      console.log('✅ DEFAULT agregado a mensaje');
    } catch (e) {
      console.log('⚠️ Error agregando DEFAULT:', e.message);
    }
    
    console.log('\n🔧 FIX 2: Hacer mensaje completamente nullable');
    try {
      await client.query(`
        ALTER TABLE notificaciones_push 
        ALTER COLUMN mensaje DROP NOT NULL;
      `);
      console.log('✅ NOT NULL removido de mensaje');
    } catch (e) {
      console.log('⚠️ Error removiendo NOT NULL:', e.message);
    }
    
    console.log('\n🔧 FIX 3: Verificar que titulo y tipo tengan defaults');
    try {
      await client.query(`
        ALTER TABLE notificaciones_push 
        ALTER COLUMN titulo SET DEFAULT 'Sin título';
      `);
      console.log('✅ DEFAULT agregado a titulo');
    } catch (e) {
      console.log('⚠️ Error con titulo:', e.message);
    }
    
    try {
      await client.query(`
        ALTER TABLE notificaciones_push 
        ALTER COLUMN tipo SET DEFAULT 'general';
      `);
      console.log('✅ DEFAULT agregado a tipo');
    } catch (e) {
      console.log('⚠️ Error con tipo:', e.message);
    }
    
    console.log('\n🧪 PROBANDO INSERT DESPUÉS DE TODOS LOS FIXES:');
    try {
      const resultado = await client.query(`
        INSERT INTO notificaciones_push 
        (usuario_id, titulo, tipo, cuerpo, datos, creada_en, leida)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, mensaje, titulo, tipo;
      `, [
        999,
        'Test Después Fix',
        'test',
        'Body test',
        '{"test": "final"}',
        new Date(),
        false
      ]);
      
      console.log('🎉 INSERT EXITOSO!');
      console.log('   ID:', resultado.rows[0].id);
      console.log('   mensaje:', resultado.rows[0].mensaje);
      console.log('   titulo:', resultado.rows[0].titulo);
      console.log('   tipo:', resultado.rows[0].tipo);
      
      // Limpiar
      await client.query('DELETE FROM notificaciones_push WHERE id = $1', [resultado.rows[0].id]);
      console.log('🗑️ Test data limpiada');
      
    } catch (insertError) {
      console.log('❌ INSERT AÚN FALLA:');
      console.log(`   Error: ${insertError.message}`);
      console.log(`   Código: ${insertError.code}`);
    }
    
    console.log('\n📊 ESTADO FINAL:');
    const estadoFinal = await client.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'notificaciones_push'
      AND column_name IN ('mensaje', 'titulo', 'tipo', 'cuerpo', 'datos')
      ORDER BY column_name;
    `);
    
    estadoFinal.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? '✅ NULLABLE' : '❌ NOT NULL';
      const def = row.column_default || 'NO DEFAULT';
      console.log(`   ${row.column_name}: ${nullable} | ${def}`);
    });
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    await client.end();
  }
}

fixDefinitivo();