import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

import Municipio from '#models/municipio'

export default class Departamento extends BaseModel {
  static table = 'departamentos'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nombre: string

  @column()
  declare codigo: string | null

  @hasMany(() => Municipio, {
    foreignKey: 'departamentoId',
  })
  declare municipios: HasMany<typeof Municipio>
}