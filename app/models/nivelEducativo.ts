import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import Institucion from '#models/institucion'
import Grado from '#models/grado'

export default class NivelEducativo extends BaseModel {
  static table = 'niveles_educativos'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nombre: string

  @column()
  declare descripcion: string | null

  @column()
  declare abreviatura: string | null

  @column({ columnName: 'orden' })
  declare orden: number

  @column({ columnName: 'institucion_id' })
  declare institucionId: number

  @column({ columnName: 'es_predeterminado' })
  declare esPredeterminado: boolean

  @belongsTo(() => Institucion, {
    foreignKey: 'institucionId',
  })
  declare institucion: BelongsTo<typeof Institucion>

  @hasMany(() => Grado, {
    foreignKey: 'nivelEducativoId',
  })
  declare grados: HasMany<typeof Grado>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ columnName: 'actualizado_en', autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime

  @column.dateTime({ columnName: 'eliminado_en' })
  declare eliminadoEn: DateTime | null
}
