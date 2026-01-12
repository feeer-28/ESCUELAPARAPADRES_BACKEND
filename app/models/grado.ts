import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

import Curso from '#models/curso'
import Docente from '#models/docente'

export default class Grado extends BaseModel {
  static table = 'grados'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nombre: string

  @column()
  declare orden: number | null

  @hasMany(() => Curso, {
    foreignKey: 'gradoId',
  })
  declare cursos: HasMany<typeof Curso>

  @hasMany(() => Docente, {
    foreignKey: 'gradoAsignado',
  })
  declare docentesAsignados: HasMany<typeof Docente>
}