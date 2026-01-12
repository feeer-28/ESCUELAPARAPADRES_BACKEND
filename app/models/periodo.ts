import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import Asignacion from '#models/asignacion'
import Calificacion from '#models/calificacion'
import Institucion from '#models/institucion'

export default class Periodo extends BaseModel {
  static table = 'periodos'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nombre: string

  @column.date({ columnName: 'fecha_inicio' })
  declare fechaInicio: DateTime

  @column.date({ columnName: 'fecha_fin' })
  declare fechaFin: DateTime

  @column({ columnName: 'institucion_id' })
  declare institucionId: number

  @column({ columnName: 'esta_activo' })
  declare estaActivo: boolean

  @belongsTo(() => Institucion, {
    foreignKey: 'institucionId',
  })
  declare institucion: BelongsTo<typeof Institucion>

  @hasMany(() => Asignacion, {
    foreignKey: 'periodoId',
  })
  declare asignaciones: HasMany<typeof Asignacion>

  @hasMany(() => Calificacion, {
    foreignKey: 'periodoId',
  })
  declare calificaciones: HasMany<typeof Calificacion>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime

  @column.dateTime({ columnName: 'actualizado_en', autoCreate: true, autoUpdate: true })
  declare actualizadoEn: DateTime
}