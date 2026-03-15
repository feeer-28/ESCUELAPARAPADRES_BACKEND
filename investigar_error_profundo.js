// Investigación profunda: ¿Por qué mensaje sigue dando error si ya es nullable?

import pkg from 'pg';
const { Client } = pkg;

console.log('🔍 INVESTIGACIÓN PROFUNDA DEL ERROR 23502');
console.log('==========================================');

const client = new Client({
  host: 'aws-0-us-west-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.dlchjtewqwpuichmuxwr',
  password: 'ESCUELADEPADRES',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function investigarProfundo() {
  try {
    await client.connect();
    
    // 1. Verificar triggers
    console.log('🔍 1. VERIFICANDO TRIGGERS EN notificaciones_push:');
    const triggers = await client.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'notificaciones_push';
    `);
    
    if (triggers.rows.length > 0) {
      console.log('⚠️ TRIGGERS ENCONTRADOS:');
      triggers.rows.forEach(tr => {
        console.log(`   ${tr.trigger_name}: ${tr.event_manipulation} - ${tr.action_statement}`);
      });
    } else {
      console.log('✅ No hay triggers problemáticos');
    }
    
    // 2. Verificar constraints
    console.log('\n🔍 2. VERIFICANDO CONSTRAINTS:');
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type, column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'notificaciones_push'
      AND ccu.column_name = 'mensaje';
    `);
    
    if (constraints.rows.length > 0) {
      console.log('⚠️ CONSTRAINTS EN COLUMNA mensaje:');
      constraints.rows.forEach(con => {
        console.log(`   ${con.constraint_name}: ${con.constraint_type}`);
      });
    } else {
      console.log('✅ No hay constraints problemáticos en mensaje');
    }
    
    // 3. Verificar estructura completa y defaults
    console.log('\n🔍 3. ESTRUCTURA COMPLETA ACTUAL:');
    const estructura = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'notificaciones_push'
      ORDER BY ordinal_position;
    `);
    
    estructura.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '✅' : '❌';
      const defaultVal = col.column_default || 'null';
      console.log(`   ${col.column_name.padEnd(15)} | ${nullable} | default: ${defaultVal}`);
    });
    
    // 4. Probar INSERT exacto que está fallando
    console.log('\n🔍 4. PROBANDO INSERT EXACTO QUE FALLA:');
    console.log('Simulando: INSERT INTO notificaciones_push (creada_en, cuerpo, datos, leida, tipo, titulo, usuario_id)');
    
    try {
      // Simular exactamente el INSERT que está fallando
      const testInsert = await client.query(`
        INSERT INTO notificaciones_push 
        (creada_en, cuerpo, datos, leida, tipo, titulo, usuario_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id;
      `, [
        new Date(),
        'Test body',
        '{"test": true}',
        false,
        'test',
        'Test Title',
        999
      ]);
      
      console.log('✅ INSERT EXITOSO! ID:', testInsert.rows[0].id);
      
      // Verificar qué se insertó
      const verificar = await client.query(`
        SELECT * FROM notificaciones_push WHERE id = $1;
      `, [testInsert.rows[0].id]);
      
      console.log('📊 Datos insertados:');
      console.log('   mensaje:', verificar.rows[0].mensaje);
      console.log('   cuerpo:', verificar.rows[0].cuerpo);
      console.log('   titulo:', verificar.rows[0].titulo);
      
      // Limpiar
      await client.query('DELETE FROM notificaciones_push WHERE id = $1', [testInsert.rows[0].id]);
      
    } catch (insertError) {
      console.log('❌ INSERT SIGUE FALLANDO:');
      console.log(`   Error: ${insertError.message}`);
      console.log(`   Código: ${insertError.code}`);
      console.log(`   Detalle: ${insertError.detail}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

investigarProfundo();