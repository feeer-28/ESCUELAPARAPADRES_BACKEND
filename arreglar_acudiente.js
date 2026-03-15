import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'

async function arreglarAcudiente() {
  try {
    console.log('🔧 ARREGLANDO PROBLEMA DE LOGIN ACUDIENTE')
    console.log('=' .repeat(50))
    
    // 1. Verificar roles disponibles
    const roles = await db.from('roles').select('*')
    console.log('\n📋 Roles disponibles:')
    roles.forEach(rol => {
      console.log(`   ID: ${rol.id}, Nombre: ${rol.nombre}`)
    })
    
    // 2. Verificar datos actuales del acudiente
    const usuario = await db.from('usuarios').where('correo', 'acudiente.test@gmail.com').first()
    console.log('\n👤 Usuario actual:')
    console.log(`   ID: ${usuario.id}`)
    console.log(`   Correo: ${usuario.correo}`)
    console.log(`   Rol ID actual: ${usuario.rol_id}`)
    console.log(`   Activo: ${usuario.esta_activo}`)
    
    // 3. Buscar el rol de acudiente correcto
    const rolAcudiente = await db.from('roles').where('nombre', 'like', '%acudiente%').first()
    if (!rolAcudiente) {
      console.log('\n❌ No se encontró rol de acudiente. Creando rol...')
      
      // Crear rol de acudiente
      const nuevoRolId = await db.table('roles').insertGetId({
        nombre: 'Acudiente',
        descripcion: 'Rol para padres de familia',
        creado_en: new Date().toISOString()
      })
      
      console.log(`✅ Rol de acudiente creado con ID: ${nuevoRolId}`)
      
      // Actualizar usuario al nuevo rol
      await db.from('usuarios').where('id', usuario.id).update({
        rol_id: nuevoRolId
      })
      
      console.log(`✅ Usuario actualizado al rol ID: ${nuevoRolId}`)
    } else {
      console.log(`\n✅ Rol de acudiente encontrado: ID ${rolAcudiente.id}, Nombre: ${rolAcudiente.nombre}`)
      
      // Actualizar usuario al rol correcto
      await db.from('usuarios').where('id', usuario.id).update({
        rol_id: rolAcudiente.id
      })
      
      console.log(`✅ Usuario actualizado al rol ID: ${rolAcudiente.id}`)
    }
    
    // 4. Resetear contraseña a algo conocido
    const nuevaContrasena = 'Acudiente123!'
    const hashedPassword = await hash.make(nuevaContrasena)
    
    await db.from('usuarios').where('id', usuario.id).update({
      contrasena_hash: hashedPassword,
      esta_activo: true
    })
    
    console.log(`\n🔐 Contraseña reseteada exitosamente`)
    console.log(`   Nueva contraseña: ${nuevaContrasena}`)
    console.log(`   Usuario: acudiente.test@gmail.com`)
    console.log(`   Documento: 1234567890`)
    
    // 5. Verificar datos finales
    const usuarioActualizado = await db.from('usuarios').where('id', usuario.id).first()
    console.log('\n👤 Usuario actualizado:')
    console.log(`   ID: ${usuarioActualizado.id}`)
    console.log(`   Correo: ${usuarioActualizado.correo}`)
    console.log(`   Rol ID: ${usuarioActualizado.rol_id}`)
    console.log(`   Activo: ${usuarioActualizado.esta_activo}`)
    
    // 6. Verificar acudiente asociado
    const acudiente = await db.from('acudientes').where('usuario_id', usuario.id).first()
    console.log('\n👨‍👩‍👧‍👦 Acudiente asociado:')
    console.log(`   ID: ${acudiente.id}`)
    console.log(`   Nombre: ${acudiente.nombres} ${acudiente.apellidos}`)
    console.log(`   Documento: ${acudiente.numero_documento}`)
    console.log(`   Usuario ID: ${acudiente.usuario_id}`)
    
    console.log('\n🎯 DATOS PARA PRUEBA DE LOGIN:')
    console.log('=====================================')
    console.log(`📱 Documento: 1234567890`)
    console.log(`🔐 Contraseña: ${nuevaContrasena}`)
    console.log(`📧 Correo: acudiente.test@gmail.com`)
    console.log('=====================================')
    
    console.log('\n✅ ¡PROBLEMA SOLUCIONADO!')
    console.log('🚀 Ahora puedes probar el login con estos datos')
    
    await db.manager.disconnect()
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

arreglarAcudiente()
