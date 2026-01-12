import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import Departamento from '#models/departamento'
import Institucion from '#models/institucion'

export default class Municipio extends BaseModel {
  static table = 'municipios'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nombre: string

  @column({ columnName: 'departamento_id' })
  declare departamentoId: number

  @column()
  declare codigo: string | null

  @belongsTo(() => Departamento, {
    foreignKey: 'departamentoId',
  })
  declare departamento: BelongsTo<typeof Departamento>

  @hasMany(() => Institucion, {
    foreignKey: 'municipioId',
  })
  declare instituciones: HasMany<typeof Institucion>
}