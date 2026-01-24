import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Usuario from '#models/usuario'

export default class extends BaseSeeder {
  async run() {
    // Crear admin_sistema de prueba
    const adminEmail = 'admin@educacionpopayan.gov.co'
    
    // Verificar si ya existe
    const existente = await Usuario.findBy('correo', adminEmail)
    
    if (existente) {
      console.log('⚠️ Admin ya existe, actualizando...')
      existente.contrasenaHash = 'Admin123!'
      existente.rolId = 1 // admin_sistema
      existente.estaActivo = true
      existente.debeCambiarContrasena = false
      await existente.save()
      console.log('✅ Admin actualizado')
    } else {
      await Usuario.create({
        correo: adminEmail,
        contrasenaHash: 'Admin123!', // El modelo se encarga del hash
        rolId: 1, // admin_sistema
        estaActivo: true,
        debeCambiarContrasena: false,
      })
      console.log('✅ Admin creado exitosamente')
    }

    console.log('📧 Email: admin@educacionpopayan.gov.co')
    console.log('🔑 Password: Admin123!')
  }
}
