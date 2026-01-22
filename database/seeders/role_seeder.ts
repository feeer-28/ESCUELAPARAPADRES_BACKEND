import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Role from '#models/role'

export default class extends BaseSeeder {
  async run() {
    // Definir los 6 roles del sistema
    const roles = [
      {
        id: 1,
        nombre: 'admin_sistema',
        estaActivo: true,
      },
      {
        id: 2,
        nombre: 'rector',
        estaActivo: true,
      },
      {
        id: 3,
        nombre: 'coordinador',
        estaActivo: true,
      },
      {
        id: 4,
        nombre: 'orientador',
        estaActivo: true,
      },
      {
        id: 5,
        nombre: 'docente',
        estaActivo: true,
      },
      {
        id: 6,
        nombre: 'acudiente',
        estaActivo: true,
      },
    ]

    // Usar updateOrCreate para evitar duplicados
    for (const roleData of roles) {
      await Role.updateOrCreate(
        { id: roleData.id }, // Buscar por ID
        roleData // Datos a insertar/actualizar
      )
    }

    console.log('✅ Seed de roles completado: 6 roles creados/actualizados')
  }
}
