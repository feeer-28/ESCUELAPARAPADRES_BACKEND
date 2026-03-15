import db from '@adonisjs/lucid/services/db';

async function checkRoles() {
  try {
    const roles = await db.from('roles').select('*');
    console.log('📋 Roles disponibles:');
    roles.forEach(rol => {
      console.log(`   ID: ${rol.id}, Nombre: ${rol.nombre}`);
    });
    
    // Verificar el rol del usuario acudiente
    const usuario = await db.from('usuarios').where('correo', 'acudiente.test@gmail.com').first();
    console.log(`\n👤 Usuario acudiente.test@gmail.com:`);
    console.log(`   ID: ${usuario.id}, Rol ID: ${usuario.rol_id}, Activo: ${usuario.esta_activo}`);
    
    // Verificar el acudiente
    const acudiente = await db.from('acudientes').where('numero_documento', '1234567890').first();
    console.log(`\n👨‍👩‍👧‍👦 Acudiente con documento 1234567890:`);
    console.log(`   ID: ${acudiente.id}, Usuario ID: ${acudiente.usuario_id}, Nombre: ${acudiente.nombres} ${acudiente.apellidos}`);
    
    await db.manager.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRoles();
