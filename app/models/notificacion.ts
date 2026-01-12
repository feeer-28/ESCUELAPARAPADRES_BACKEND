import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Asignacion from '#models/asignacion'
import Institucion from '#models/institucion'
import Usuario from '#models/usuario'

export default class Notificacion extends BaseModel {
  static table = 'notificaciones'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'destinatario_id' })
  declare destinatarioId: number

  @column()
  declare tipo: string

  @column()
  declare asunto: string | null

  @column()
  declare mensaje: string

  @column()
  declare estado: string

  @column.dateTime({ columnName: 'enviado_en' })
  declare enviadoEn: DateTime | null

  @column.dateTime({ columnName: 'leido_en' })
  declare leidoEn: DateTime | null

  @column({ columnName: 'asignacion_id' })
  declare asignacionId: number | null

  @column()
  declare metadatos: any | null

  @column({ columnName: 'institucion_id' })
  declare institucionId: number | null

  @belongsTo(() => Usuario, {
    foreignKey: 'destinatarioId',
  })
  declare destinatario: BelongsTo<typeof Usuario>

  @belongsTo(() => Asignacion, {
    foreignKey: 'asignacionId',
  })
  declare asignacion: BelongsTo<typeof Asignacion>

  @belongsTo(() => Institucion, {
    foreignKey: 'institucionId',
  })
  declare institucion: BelongsTo<typeof Institucion>

  @column.dateTime({ columnName: 'creado_en', autoCreate: true })
  declare creadoEn: DateTime
}