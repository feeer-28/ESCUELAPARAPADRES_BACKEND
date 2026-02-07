import db from '@adonisjs/lucid/services/db'

async function verificarUsuarios() {
  try {
    console.log('🔍 Verificando usuarios en la base de datos...')
    
    // Verificar usuarios
    const usuarios = await db.from('usuarios').select('id', 'correo', 'rol_id', 'esta_activo').limit(5)
    console.log('\n👥 Usuarios encontrados:')
    usuarios.forEach(user => {
      console.log(`  ID: ${user.id}, Email: ${user.correo}, Rol: ${user.rol_id}, Activo: ${user.esta_activo}`)
    })
    
    // Verificar acudientes
    const acudientes = await db.from('acudientes').select('id', 'nombres', 'apellidos', 'numero_documento', 'usuario_id').limit(3)
    console.log('\n👨‍👩‍👧‍👦 Acudientes encontrados:')
    acudientes.forEach(acud => {
      console.log(`  ID: ${acud.id}, Nombre: ${acud.nombres} ${acud.apellidos}, Doc: ${acud.numero_documento}, Usuario ID: ${acud.usuario_id}`)
    })
    
    // Buscar un acudiente con rol 6
    const acudienteCompleto = await db.from('acudientes as a')
      .join('usuarios as u', 'a.usuario_id', 'u.id')
      .where('u.rol_id', 6) // Rol acudiente
      .where('u.esta_activo', true)
      .select('a.id', 'a.nombres', 'a.apellidos', 'a.numero_documento', 'u.id as usuario_id', 'u.correo')
      .first()
    
    if (acudienteCompleto) {
      console.log('\n✅ Acudiente válido para pruebas:')
      console.log(`  Nombre: ${acudienteCompleto.nombres} ${acudienteCompleto.apellidos}`)
      console.log(`  Documento: ${acudienteCompleto.numero_documento}`)
      console.log(`  Email: ${acudienteCompleto.correo}`)
      console.log(`  Usuario ID: ${acudienteCompleto.usuario_id}`)
      
      // Crear una contraseña de prueba si no existe
      const passwordHash = await db.from('usuarios').where('id', acudienteCompleto.usuario_id).select('contrasena_hash').first()
      if (!passwordHash || !passwordHash.contrasena_hash) {
        console.log('\n⚠️  El usuario no tiene contraseña hash')
      } else {
        console.log('\n✅ Usuario tiene contraseña hash configurada')
      }
    } else {
      console.log('\n❌ No se encontraron acudientes activos con rol 6')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await db.manager.disconnect()
  }
}

verificarUsuarios()
