import db from '@adonisjs/lucid/services/db'

async function verificarTablas() {
  try {
    console.log('🔍 Verificando estructura de tablas existentes...\n')
    
    // Verificar tabla dispositivos_moviles
    console.log('📱 Tabla: dispositivos_moviles')
    try {
      const dispositivosColumns = await db.rawQuery(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'dispositivos_moviles'
        ORDER BY ordinal_position
      `)
      
      dispositivosColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable}) ${col.column_default ? `[${col.column_default}]` : ''}`)
      })
    } catch (error) {
      console.log('  ❌ Error al consultar dispositivos_moviles:', error.message)
    }
    
    console.log('\n🔔 Tabla: notificaciones_push')
    try {
      const notificacionesColumns = await db.rawQuery(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'notificaciones_push'
        ORDER BY ordinal_position
      `)
      
      notificacionesColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable}) ${col.column_default ? `[${col.column_default}]` : ''}`)
      })
    } catch (error) {
      console.log('  ❌ Error al consultar notificaciones_push:', error.message)
    }
    
    console.log('\n📊 Verificar datos existentes:')
    try {
      const dispositivosCount = await db.from('dispositivos_moviles').count('* as total')
      console.log(`  📱 Dispositivos registrados: ${dispositivosCount[0].total}`)
      
      const notificacionesCount = await db.from('notificaciones_push').count('* as total')
      console.log(`  🔔 Notificaciones existentes: ${notificacionesCount[0].total}`)
    } catch (error) {
      console.log('  ❌ Error al contar registros:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  } finally {
    await db.manager.disconnect()
  }
}

verificarTablas()
