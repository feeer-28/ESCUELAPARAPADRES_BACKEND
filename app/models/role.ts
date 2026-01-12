import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

import Usuario from '#models/usuario'

export default class Role extends BaseModel {
  static table = 'roles'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nombre: string

  @column({ columnName: 'esta_activo' })
  declare estaActivo: boolean

  @hasMany(() => Usuario, {
    foreignKey: 'rolId',
  })
  declare usuarios: HasMany<typeof Usuario>
}